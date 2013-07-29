/**
 * Abstract Controller. Provides common functionalty
 */
Ext.define('Rendering.controller.Base', {
    extend: 'Ext.app.Controller',
    
    /**
     * A custom logic to render views. If the view is already rendered
     * just display it. Otherwise create it on demand.
     */
    render: function(xtype) {
        var tabPanel= Ext.getCmp('viewport').child('tabpanel'),
            view    = tabPanel.child(xtype);
        
        if (!view) {
            view = tabPanel.add({
                xtype: xtype
            });
        }
        
        tabPanel.setActiveTab(view);
        return view;
    }
});