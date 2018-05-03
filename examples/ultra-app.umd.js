var ultraApp = (function (exports) {
  'use strict';

  function h(name, attributes) {
    var rest = [];
    var children = [];
    var length = arguments.length;

    while (length-- > 2) rest.push(arguments[length]);

    while (rest.length) {
      var node = rest.pop();
      if (node && node.pop) {
        for (length = node.length; length--; ) {
          rest.push(node[length]);
        }
      } else if (node != null && node !== true && node !== false) {
        children.push(node);
      }
    }

    return {
      name: name,
      attributes: attributes || {},
      children: children,
      key: attributes && attributes.key
    }
  }

  function clone(target, source) {
    var obj = {};

    for (var i in target) obj[i] = target[i];
    for (var i in source) obj[i] = source[i];

    return obj
  }

  function eventListener(event) {
    return event.currentTarget.events[event.type](event)
  }

  function updateAttribute(element, name, value, oldValue, isSVG) {
    if (name === "key") ; else if (name === "style") {
      for (var i in clone(oldValue, value)) {
        var style = value == null || value[i] == null ? "" : value[i];
        if (i[0] === "-") {
          element[name].setProperty(i, style);
        } else {
          element[name][i] = style;
        }
      }
    } else {
      if (name[0] === "o" && name[1] === "n") {
        if (!element.events) {
          element.events = {};
        }
        element.events[(name = name.slice(2))] = value;

        if (value) {
          if (!oldValue) {
            element.addEventListener(name, eventListener);
          }
        } else {
          element.removeEventListener(name, eventListener);
        }
      } else if (name in element && name !== "list" && !isSVG) {
        element[name] = value == null ? "" : value;
      } else if (value != null && value !== false) {
        element.setAttribute(name, value);
      }

      if (value == null || value === false) {
        element.removeAttribute(name);
      }
    }
  }

  function createElement(node, lifecycle, isSVG) {
    var element =
      typeof node === "string" || typeof node === "number"
        ? document.createTextNode(node)
        : (isSVG = isSVG || node.name === "svg")
          ? document.createElementNS("http://www.w3.org/2000/svg", node.name)
          : document.createElement(node.name);

    var attributes = node.attributes;
    if (attributes) {
      if (attributes.oncreate) {
        lifecycle.push(function() {
          attributes.oncreate(element);
        });
      }

      for (var i = 0; i < node.children.length; i++) {
        element.appendChild(createElement(node.children[i], lifecycle, isSVG));
      }

      for (var name in attributes) {
        updateAttribute(element, name, attributes[name], null, isSVG);
      }
    }

    return element
  }

  function updateElement(
    element,
    oldAttributes,
    attributes,
    lifecycle,
    isSVG
  ) {
    for (var name in clone(oldAttributes, attributes)) {
      if (
        attributes[name] !==
        (name === "value" || name === "checked"
          ? element[name]
          : oldAttributes[name])
      ) {
        updateAttribute(
          element,
          name,
          attributes[name],
          oldAttributes[name],
          isSVG
        );
      }
    }

    if (attributes.onupdate) {
      lifecycle.push(function() {
        attributes.onupdate(element, oldAttributes);
      });
    }
  }

  function removeChildren(element, node) {
    var attributes = node.attributes;
    if (attributes) {
      for (var i = 0; i < node.children.length; i++) {
        removeChildren(element.childNodes[i], node.children[i]);
      }

      if (attributes.ondestroy) {
        attributes.ondestroy(element);
      }
    }
    return element
  }

  function removeElement(parent, element, node) {
    function done() {
      parent.removeChild(removeChildren(element, node));
    }

    var cb = node.attributes && node.attributes.onremove;
    if (cb) {
      cb(element, done);
    } else {
      done();
    }
  }

  function getKey(node) {
    return node ? node.key : null
  }

  function patch(parent, element, oldNode, node, lifecycle, isSVG) {
    if (node === oldNode) ; else if (oldNode == null || oldNode.name !== node.name) {
      var newElement = createElement(node, lifecycle, isSVG);

      parent.insertBefore(newElement, element);
      if (oldNode != null) {
        removeElement(parent, element, oldNode);
      }

      element = newElement;
    } else if (oldNode.name == null) {
      element.nodeValue = node;
    } else {
      updateElement(
        element,
        oldNode.attributes,
        node.attributes,
        lifecycle,
        (isSVG = isSVG || node.name === "svg")
      );

      var oldKeyed = {};
      var newKeyed = {};
      var oldElements = [];
      var oldChildren = oldNode.children;
      var children = node.children;

      for (var i = 0; i < oldChildren.length; i++) {
        oldElements[i] = element.childNodes[i];

        var oldKey = getKey(oldChildren[i]);
        if (oldKey != null) {
          oldKeyed[oldKey] = [oldElements[i], oldChildren[i]];
        }
      }

      var i = 0;
      var k = 0;

      while (k < children.length) {
        var oldKey = getKey(oldChildren[i]);
        var newKey = getKey(children[k]);

        if (newKeyed[oldKey]) {
          i++;
          continue
        }

        if (newKey != null && newKey === getKey(oldChildren[i + 1])) {
          if (oldKey == null) {
            removeElement(element, oldElements[i], oldChildren[i]);
          }
          i++;
          continue
        }

        if (newKey == null || oldNode.recycled) {
          if (oldKey == null) {
            patch(
              element,
              oldElements[i],
              oldChildren[i],
              children[k],
              lifecycle,
              isSVG
            );
            k++;
          }
          i++;
        } else {
          var keyedNode = oldKeyed[newKey] || [];

          if (oldKey === newKey) {
            patch(
              element,
              keyedNode[0],
              keyedNode[1],
              children[k],
              lifecycle,
              isSVG
            );
            i++;
          } else if (keyedNode[0]) {
            patch(
              element,
              element.insertBefore(keyedNode[0], oldElements[i]),
              keyedNode[1],
              children[k],
              lifecycle,
              isSVG
            );
          } else {
            patch(element, oldElements[i], null, children[k], lifecycle, isSVG);
          }

          newKeyed[newKey] = children[k];
          k++;
        }
      }

      while (i < oldChildren.length) {
        if (getKey(oldChildren[i]) == null) {
          removeElement(element, oldElements[i], oldChildren[i]);
        }
        i++;
      }

      for (var i in oldKeyed) {
        if (!newKeyed[i]) {
          removeElement(element, oldKeyed[i][0], oldKeyed[i][1]);
        }
      }
    }
    return element
  }

  function render(node, container) {
    var lifecycle = [];
    var element = container.children[0];

    patch(
      container,
      element,
      element && element.node,
      node,
      lifecycle
    ).node = node;

    while (lifecycle.length) lifecycle.pop()();
  }

  // Not sure if it's rollup or chrome, but I had to do this to get it to work :|
  const h$1 = h;

  const app = (initialState, reducer, view, element) => {
    const dispatch = (payload, transfers) => {
      reducer.postMessage(payload, transfers);
    };

    reducer.onmessage = e => {
      const { state } = e.data;
      render(view(state), element);
    };

    dispatch({ type: 'INIT', state: initialState });

    return dispatch;
  };

  exports.h = h$1;
  exports.app = app;

  return exports;

}({}));
