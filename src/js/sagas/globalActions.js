import { take, put, call, fork, select, takeEvery, all } from 'redux-saga/effects'
import * as actions from '../actions/globalActions'
import * as actionsExchange from '../actions/exchangeActions'
import * as actionsUtils from '../actions/utilActions'
import { closeImportLoading } from '../actions/accountActions'
import { reconnectWS } from '../actions/connectionActions'
import { Rate } from "../services/rate"
import { push } from 'react-router-redux';
import { addTranslationForLanguage, setActiveLanguage, getActiveLanguage } from 'react-localize-redux';

import { getLanguage } from "../services/language"
import Language from "../../../lang"
import { store } from '../store'

export function* getLatestBlock(action) {
  const ethereum = action.payload
  const block = yield call(ethereum.call("getLatestBlock"))
  yield put(actions.updateBlockComplete(block))
}

export function* updateHistoryExchange(action) {
  const { ethereum, page, itemPerPage, isAutoFetch } = action.payload
  if(wsIsConnected()){
    yield call(getWsData, 'GET_LOGS_HISTORY')
  }else{
    yield put(reconnectWS())
    var latestBlock = yield call(ethereum.call("getLatestBlock"))
    const newLogs = yield call(ethereum.call("getLogOneColumn"), page, itemPerPage)
    yield put(actions.updateHistory(newLogs, latestBlock, page, isAutoFetch))
  }
}

export function* goToRoute(action) {
  yield put(push(action.payload));
}

export function* clearSession(action) {
  yield put(actions.clearSessionComplete())
  yield put(actions.goToRoute('/'));
}

function getWsData(msg) {
  const ws = store.getState().connection.ws
  ws.send(msg)
  ws.onmessage = (res) => {
    let data = JSON.parse(res.data)
    console.log(data);
    switch(data[0]){
      case 'GET_RATE': {
        store.dispatch(actions.updateAllRateComplete(data[1]))
        break
      }
      case 'GET_RATE_USD': {
        store.dispatch(actions.updateAllRateUSDComplete(data[1]))
        break
      }
      case 'GET_LOGS_HISTORY': {
        store.dispatch(actions.updateHistory(data[1]))
        break
      }
    }
  }
  ws.onerror = (err) => {
    console.log(err)
  }

}

function wsIsConnected() {
  const ws = store.getState().connection.ws
  return ws.readyState == WebSocket.OPEN
}

export function* updateAllRate(action) {
  const { ethereum, tokens } = action.payload
  try {
    if(wsIsConnected()){
      yield call(getWsData, 'GET_RATE')
    }else{
      yield put(reconnectWS())
      console.log('server')
      let rates = yield call([ethereum, ethereum.call("getAllRatesFromServer")], tokens)
      yield put(actions.updateAllRateComplete(rates))
    }
    
  }
  catch (err) {
    //get rate from blockchain
    console.log('blockchain')
    try {
      const rates = yield call([ethereum, ethereum.call("getAllRatesFromBlockchain")], tokens)
      yield put(actions.updateAllRateComplete(rates))
    }
    catch (err) {
      console.log(err)
    }
  }
}

export function* updateRateUSD(action) {
  const { ethereum, tokens } = action.payload
  try {
    if(wsIsConnected()){
      yield call(getWsData, 'GET_RATE_USD')
    }else{
      yield put(reconnectWS())
      let rates = yield call([ethereum, ethereum.call("getAllRatesUSDFromServer")], tokens)
      yield put(actions.updateAllRateUSDComplete(rates))
    }
    yield put(actions.showBalanceUSD())
  }
  catch (err) {
    yield put(actions.hideBalanceUSD())
    //get rate from blockchain
    // try {
    //   const rates = yield call([ethereum, ethereum.call("getAllRatesUSDFromThirdParty")], tokens)
    //   yield put(actions.updateAllRateUSDComplete(rates))
    // } catch (err) {
    //   console.log(err)
    // }
  }
}



export function* checkConnection(action) {
  var { ethereum, count, maxCount, isCheck } = action.payload
  const isConnected = yield call([ethereum, ethereum.call("isConnectNode")])
  //console.log(isConnected)
  if (isConnected) {
    if (!isCheck) {
      yield put(actions.updateIsCheck(true))
      yield put(actions.updateCountConnection(0))
    }
  } else {
    if (isCheck) {
      if (count > maxCount) {
        yield put(actions.updateIsCheck(false))
        yield put(actions.updateCountConnection(0))
        return
      }
      if (count === maxCount) {
        yield put(actionsUtils.openInfoModal("error.error_occurred", "error.network_error"))
        yield put(closeImportLoading())
        yield put(actions.updateCountConnection(++count))
        return
      }
      if (count < maxCount) {
        yield put(actions.updateCountConnection(++count))
        return
      }
    }
  }
}

export function* setGasPrice(action) {
  try{
    const ethereum = action.payload
    const gasPrice = yield call([ethereum, ethereum.call("getGasPrice")])
    yield put(actions.setGasPriceComplete(gasPrice))
  }catch(err)
  {
    console.log(err)
  }
  
}

export function* setMaxGasPrice(action) {
  try{
    const ethereum = action.payload
    const maxGasPrice = yield call(ethereum.call("getMaxGasPrice"))
    yield put(actionsExchange.setMaxGasPriceComplete(maxGasPrice))
  }catch(err)
  {
    console.log(err)
  }
  
}


export function* changelanguage(action) {
  const { ethereum, lang, locale } = action.payload

  if (Language.supportLanguage.indexOf(lang) < 0) return
  try {
    var activeLang = lang
    if (!Language.loadAll && lang !== Language.defaultLanguage) {
      activeLang = lang == Language.defaultLanguage ? Language.defaultLanguage : Language.defaultAndActive[1]
      if (!locale || locale.translations["pack"][1] !== lang) {
        var languagePack = yield call(ethereum.call("getLanguagePack"), lang)
        if (!languagePack) return;

        yield put.sync(addTranslationForLanguage(languagePack, activeLang))
      }
    }
    yield put(setActiveLanguage(activeLang))
  } catch (err) {
    console.log(err)
  }
}

export function* watchGlobal() {
  yield takeEvery("GLOBAL.NEW_BLOCK_INCLUDED_PENDING", getLatestBlock)

  yield takeEvery("GLOBAL.GO_TO_ROUTE", goToRoute)
  yield takeEvery("GLOBAL.CLEAR_SESSION", clearSession)

  yield takeEvery("GLOBAL.UPDATE_HISTORY_EXCHANGE", updateHistoryExchange)
  yield takeEvery("GLOBAL.CHANGE_LANGUAGE", changelanguage)
  yield takeEvery("GLOBAL.CHECK_CONNECTION", checkConnection)
  yield takeEvery("GLOBAL.SET_GAS_PRICE", setGasPrice)

  yield takeEvery("GLOBAL.RATE_UPDATE_ALL_PENDING", updateAllRate)
  yield takeEvery("GLOBAL.UPDATE_RATE_USD_PENDING", updateRateUSD)


  yield takeEvery("EXCHANGE.SET_MAX_GAS_PRICE", setMaxGasPrice)
}


