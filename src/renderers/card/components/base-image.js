const { isOverlayEnabled } = require('../compose-config');

const id = 'baseImage';

function render(_ctx, _car, _layout) {
    if (!isOverlayEnabled(id)) {
        return;
    }
}

module.exports = { id, render };
