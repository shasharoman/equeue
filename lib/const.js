const fs = require('fs');
const p = require('path');

exports.TASK_STATUS = {
    PENDING: 'pending',
    READY: 'ready',
    FINISH: 'finish'
};

exports.CLEAN_SCRIPT = fs.readFileSync(p.resolve(__dirname, '../lua/clean.lua')).toString('utf8');
exports.PICK_SCRIPT = fs.readFileSync(p.resolve(__dirname, '../lua/pick.lua')).toString('utf8');