self.onmessage = (e) => {
  handleMessage(e.data);
}

self.state = {}

const setState = (nextState) => {
  self.state = Object.assign({}, self.state, nextState);
  self.postMessage({ state: self.state });
}

const handleMessage = (data) => {
  const result = reduce(data);
  let nextState = result;
  let effects = [];
  if (Array.isArray(result)) {
    nextState = result[0];
    effects = result[1];
  }
  setState(nextState);

  Promise.all(effects).then(actions => {
    for(let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action instanceof Promise) {
        action.then(handleMessage);
      } else {
        handleMessage(action);
      }
    }
  });
}

const fib = (num) => {
  return new Promise(resolve => {
    if (num <= 1) {
      resolve(1)
    } else {
      setTimeout(() => {
        Promise
          .all([fib(num - 1), fib(num - 2)])
          .then(nums => nums[0] + nums[1])
          .then(resolve);
      }, 0);
    }
  });
}

const defer = (fn) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fn()), 1);
  });
}

const reduce = action => {
  const prevState = { ...state }; // maybe deep clone?

  switch(action.type) {
    case 'INIT':
      return action.state;

    case 'COUNTER':
      return { counter: prevState.counter + action.increm };

    case 'FIBONACCI':
      const { counter, results } = prevState;
      const id = Date.now();
      return [
        { results: results.concat({ id, number: counter, result: null }) },
        [ defer(() => fib(counter).then(fibonacci => ({ type: 'FIBONACCI.COMPLETE', id, result: fibonacci }))) ],
      ];

    case 'FIBONACCI.COMPLETE':
      const nextResults = prevState.results.map(r => {
        return r.id === action.id
          ? { ...r, result: action.result }
          : r;
      });
      return { results: nextResults };

    default:
      return prevState;
  }
}
