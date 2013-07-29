Ext.define('Rendering.controller.Settings', {
    extend: 'Rendering.controller.Base',

    /**
     * Settings index. Uses the Rendering.controller.Base
     * render method
     */
    index: function() {
        this.render('settingsindex');
    }
});