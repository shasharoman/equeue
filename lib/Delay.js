const debug = require('debug')('equeue:delay');

const _ = require('lodash');
const uuid = require('uuid');
const EventEmit = require('events');

const C = require('./const');

module.exports = class Delay extends EventEmit {
    constructor(options = {}, redis) {
        super();

        this.redis = redis; // TODO: make redis client from options
        this.prefix = options.name || 'queue';

        this._scan(options.scanInterval || 300);
        this._clean(options.cleanInterval || 3000);
    }

    async listen(fn, topic = 'default', interval = 200) {
        try {
            let task = await this._popTask(topic);
            if (_.isEmpty(task)) {
                return;
            }

            await fn(task.payload);
            await this.remove(task.id);
        }
        catch (err) {
            debug('error', err);
            this.emit('error', err);
        }
        finally {
            setTimeout(() => this.listen(fn, topic, interval), interval);
        }
    }

    async push(payload, delay = 30, topic = 'default', ttr = 30) {
        let id = uuid.v4();
        delay = Number(delay) || 30;
        ttr = Number(ttr) || 30;

        let task = {
            id,
            topic,
            payload,
            timestamp: Date.now() + delay * 1000,
            ttr: ttr * 1000,
        };

        await this.redis.multi()
            .hset(this._key('pool'), id, JSON.stringify(task))
            .hset(this._key('status'), id, C.TASK_STATUS.PENDING)
            .hset(this._key('topic'), id, topic)
            .zadd(this._key('delay'), task.timestamp, id)
            .execAsync();
        return id;
    }

    async remove(id) {
        if (!id) {
            throw new Error('id cannot be empty');
        }

        await this.redis.multi()
            .zrem(this._key('delay'), id)
            .hdel(this._key('topic'), id)
            .hdel(this._key('status'), id)
            .hdel(this._key('pool'), id)
            .execAsync();
    }

    async _popTask(topic = 'default') {
        let key = `${this._key('ready')}:${topic}`;
        let taskId = await this.redis.rpoplpushAsync(key, this._key('buffer'));
        if (_.isEmpty(taskId)) {
            return {};
        }

        let task = await this._taskById(taskId);
        if (task.status !== C.TASK_STATUS.READY) {
            debug('pop task status is not ready', task);
            return {};
        }

        await this._delayTask(task.id, task.ttr);
        return task;
    }

    async _delayTask(id, delay) {
        await this.redis.multi()
            .zadd(this._key('delay'), Date.now() + delay, id)
            .hset(this._key('status'), id, C.TASK_STATUS.PENDING)
            .execAsync();
    }

    async _taskById(id) {
        let [status, task] = await this.redis.multi()
            .hget(this._key('status'), id)
            .hget(this._key('pool'), id)
            .execAsync();

        if (!status || !task) {
            return {};
        }

        task = JSON.parse(task);
        task.status = status;
        return task;
    }

    async _scan(interval = 200) {
        debug('scan');

        try {
            let now = Date.now();
            let keys = [
                this._key('delay'),
                this._key('status'),
                this._key('topic'),
                this._key('ready')
            ];
            await this.redis.evalAsync(C.PICK_SCRIPT, keys.length, ...keys, now - 12 * 3600 * 1000, now);
        }
        catch (err) {
            debug('error', err);
            this.emit('error', err);
        }
        finally {
            setTimeout(() => this._scan(interval), interval);
        }
    }

    async _clean(interval = 1000) {
        debug('clean');

        try {

            let keys = [
                this._key('buffer'),
                this._key('pool'),
                this._key('status')
            ];
            await this.redis.evalAsync(C.CLEAN_SCRIPT, keys.length, ...keys);
        }
        catch (err) {
            debug('error', err);
            this.emit('error', err);
        }
        finally {
            setTimeout(() => this._clean(interval), interval);
        }
    }

    _key(s) {
        return `${this.prefix}:${s}`;
    }
};