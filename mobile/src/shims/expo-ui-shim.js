const React = require('react');

const NullComponent = () => null;

module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return NullComponent;
      return NullComponent;
    },
  }
);
