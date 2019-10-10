const equeue = require('../');
const expect = require('chai').expect;

describe('equeue', () => {
    it('exec, ready:true', async() => {
        let series = new equeue.Series(true);
        let ret = [];

        [1, 2, 3, 4].forEach(async item => {
            ret.push(await series.exec(() => item));
        });
        await sleep(10);

        expect(ret).to.deep.equal([1, 2, 3, 4]);
    });

    it('exec, ready:false', async() => {
        let series = new equeue.Series(false);
        let ret = [];

        [1, 2, 3, 4].forEach(async item => {
            ret.push(await series.exec(() => item));
        });
        series.start();
        await sleep(10);

        expect(ret).to.deep.equal([1, 2, 3, 4]);
    });

    it('exec, ready:false without start', async() => {
        let series = new equeue.Series(false);
        let ret = [];

        [1, 2, 3, 4].forEach(async item => {
            ret.push(await series.exec(() => item));
        });
        await sleep(10);

        expect(ret).to.deep.equal([]);
    });
});

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}