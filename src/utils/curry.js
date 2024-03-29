export default function curry(fn, args) {
  const length = fn.length;

  args = args || [];

  return function() {
    let _args = args.slice(0);
    let arg;
    let i;

    for (i = 0; i < arguments.length; i++) {
      arg = arguments[i];

      _args.push(arg);
    }
    if (_args.length < length) {
      return curry.call(this, fn, _args);
    } else {
      return fn.apply(this, _args);
    }
  };
}
