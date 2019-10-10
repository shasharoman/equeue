local buffer_key = KEYS[1]
local pool_key = KEYS[2]
local status_key = KEYS[3]

if redis.call("llen", buffer_key) == 0 then 
    return nil
end

local last = redis.call("lindex", buffer_key, -1)
if redis.call("hexists", pool_key, last) == 0 then
    redis.call("rpop", buffer_key)
    return nil
end

if redis.call("hget", status_key, last) == "finish" then 
    redis.call("rpop", buffer_key)
    return nil
end

return redis.call("rpoplpush", buffer_key, buffer_key)
