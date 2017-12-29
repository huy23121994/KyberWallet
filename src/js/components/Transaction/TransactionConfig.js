import React from "react"

const TransactionConfig = (props) => {
  function specifyGas(event) {
    props.gasHandler(event)
  }

  function specifyGasPrice(event) {
    props.gasPriceHandler(event)
  }

  return (
    <div class="row transaction-fee small-12 medium-9">
      <label class="column small-12 medium-4 title">
        Gas Price
        <span class="help has-tip top" data-tooltip title="Higher gas price, faster transaction"></span>
      </label>
      <div className ={'column small-12 medium-8 gas-price ' + (props.gasPriceError !== "" ? "error" : "")}>
        <input type="number" min="0" max="99" className="gas-price-input" step="0.1" onKeyPress={props.onGasPricePress} value={props.gasPrice} onChange={specifyGasPrice.bind(this)} />
        <span className="unit">gwei</span>
        {props.gasPriceError !=="" && <span class="error-text">{props.gasPriceError}</span>}
        <p class="result">Estimate Transaction Fee: <a>{props.totalGas} eth</a></p>
      </div>
    </div>
  )

}
export default TransactionConfig