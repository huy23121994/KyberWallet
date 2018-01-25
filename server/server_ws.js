const http = require('http');
const WebSocket = require('ws');

var PersistClass = require("./persist/sqlite/sqlitePersist")
var persistor = new PersistClass()
persistor.initStore()

const wss = new WebSocket.Server({ port: 3002 });

function stringify(key, val) {
    let data = [key, val]
    return JSON.stringify(data)
}

wss.on('connection', function connection(ws, req) {

    ws.on('message', function incoming(data) {
        console.log('received: %s', data);
        switch (data) {
            case 'GET_RATE': {
                persistor.getRate().then(rateData => {
                    ws.send(stringify('GET_RATE', rateData))
                })
                break
            }
            case 'GET_RATE_USD': {
                persistor.getRateUSD().then(rateUSDData => {
                    ws.send(stringify('GET_RATE_USD', rateUSDData))
                })
                break
            }
            case 'GET_LOGS_HISTORY': {
                let page = 0
                let itemPerpage = 10
                persistor.getEvents(page, itemPerpage).then((result) => {
                    ws.send(stringify('GET_LOGS_HISTORY', { events: result }))
                })
                break
            }
        }
    });


    ws.on('error', (err) => {
        console.log(err);
    });
});