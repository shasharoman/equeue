module.exports = class Series {
    constructor(ready = false) {
        this.ready = ready;

        this.queue = [];
    }

    start() {
        if (this.ready) {
            return;
        }

        this.ready = true;
        this._pulse();
    }

    async exec(fn) {
        return new Promise((resolve, reject) => {
            fn.callback = (err, ret) => {
                delete fn.callback;

                err ? reject(err) : resolve(ret);
            };

            this.queue.push(fn);

            this.ready && this.queue.length === 1 && this._pulse();
        });
    }

    _pulse() {
        if (!this.ready || this.queue.length === 0) {
            return;
        }

        let fn = this.queue.shift();
        (async() => {
            try {
                fn.callback(null, await fn());
            }
            catch (err) {
                fn.callback(err);
            }
            finally {
                this._pulse();
            }
        })();
    }
};