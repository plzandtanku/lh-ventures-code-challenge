import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];

  // need an object of "valid" accounts and their label
  const validAccounts = state.accounts.reduce(function(acc, e) {
     acc[e.ACCOUNT] = e.LABEL; 
     return acc;
  }, {});

  // create object with structure 
  // {ACCOUNT : {DEBIT: ..., CREDIT: ..., DESCRIPTION: ...,} ... }
  // first filter out entries not in range or not a valid account
  let balanceObj = state.journalEntries.filter(function(entry) {
    if (state.accounts.length < 1 || state.journalEntries.length < 1) return false;

    // define ranges to filter on
    // if we have a NaN, assume value is *
    let startAccount = isNaN(state.userInput.startAccount) 
      ? state.accounts[0].ACCOUNT // use first account in record
      : state.userInput.startAccount;
    let endAccount = isNaN(state.userInput.endAccount) 
      ? state.accounts[state.accounts.length-1].ACCOUNT // use last account
      : state.userInput.endAccount;  
    let startPeriod = isNaN(Date.parse(state.userInput.startPeriod)) 
      ? state.journalEntries[0].PERIOD // use first period
      : state.userInput.startPeriod;
    let endPeriod = isNaN(Date.parse(state.userInput.endPeriod)) 
      ? state.journalEntries[state.journalEntries.length-1].PERIOD // use last period
      : state.userInput.endPeriod;

    return validAccounts.hasOwnProperty(entry.ACCOUNT) 
      && entry.ACCOUNT >= startAccount
      && entry.ACCOUNT <= endAccount
      && entry.PERIOD >= startPeriod 
      && entry.PERIOD <= endPeriod;
  // after filtering, create object of balances
  }).reduce(function(acc, e) {
  	// first initialize
    if (!acc.hasOwnProperty(e.ACCOUNT)) {
      acc[e.ACCOUNT] = {ACCOUNT: e.ACCOUNT};
      acc[e.ACCOUNT]["DESCRIPTION"] = validAccounts[e.ACCOUNT];
      acc[e.ACCOUNT]["DEBIT"] = e.DEBIT;
      acc[e.ACCOUNT]["CREDIT"] = e.CREDIT;
      acc[e.ACCOUNT]["BALANCE"] = e.DEBIT - e.CREDIT;
    }
    else {
      acc[e.ACCOUNT]["DEBIT"] += e.DEBIT;
      acc[e.ACCOUNT]["CREDIT"] += e.CREDIT;
      acc[e.ACCOUNT]["BALANCE"] += e.DEBIT - e.CREDIT;
    }
    return acc;
  }, {});

  // convert object into array
  Object.keys(balanceObj).forEach(function (account) {
    let entry = {};
    // the keys we want for the balance array
    ["ACCOUNT", "DESCRIPTION", "DEBIT", "CREDIT", "BALANCE"].forEach(function (key) {
      entry[key] = balanceObj[account][key];
    });
    balance.push(entry);
  });

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);
