import { render, h as _h } from 'ultradom';

// Not sure if it's rollup or chrome, but I had to do this to get it to work :|
export const h = _h;

export const app = (initialState, reducer, view, element) => {
  const dispatch = (payload, transfers) => {
    reducer.postMessage(payload, transfers);
  };

  reducer.onmessage = e => {
    const { state } = e.data;
    render(view(state), element);
  }

  dispatch({ type: 'INIT', state: initialState });

  return dispatch;
};
