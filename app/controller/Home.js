Ext.define('AM.controller.Home', {
    extend: 'Ext.app.Controller',
    views: ['home.Index'],

//actions
    index: function()
    {
        this.render('home.Index');
    }
});