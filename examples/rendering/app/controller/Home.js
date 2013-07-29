Ext.define('Rendering.controller.Home', {
    extend: 'Rendering.controller.Base',
    
    /**
     * Action for home route /.
     * Activates the first tab
     */
    index: function() {
       Ext.getCmp('viewport').child('tabpanel').setActiveTab(0);
    }
});