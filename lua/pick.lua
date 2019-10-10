local delay_key = KEYS[1]
local status_key = KEYS[2]
local topic_key = KEYS[3]
local ready_key = KEYS[4]

local target = redis.call("zrangebyscore", delay_key, ARGV[1], ARGV[2], "limit", 0, 1)[1]
if target == nil then 
    return nil
end

local status = redis.call("hget", status_key, target)
if status == "pending" then
    local topic = redis.call("hget", topic_key, target)
    if not topic then
        topic = "default"
    end

    redis.call("lpush", ready_key..":"..topic, target)
    redis.call("hset", status_key, target, "ready")
    redis.call("zrem", delay_key, target)

    return target
end

if status == "finish" then 
    redis.call("zrem", delay_key, target)
end

return nil
