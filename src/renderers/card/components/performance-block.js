const { isOverlayEnabled } = require('../compose-config');

const id = 'performance';

function render(_ctx, _car, _layout) {
    if (!isOverlayEnabled(id)) {
        return;
    }
}

module.exports = { id, render };
