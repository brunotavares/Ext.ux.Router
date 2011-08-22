Ext.define('AM.view.Viewport', {
    extend: 'Ext.container.Viewport',

//config options
    id: 'viewport',
    layout: 'border',

//inits
    initComponent: function()
    {
        this.items = [{
            xtype: 'box',
            region: 'north',
            height: 60,
            autoEl: {
                tag: 'h1',
                html: 'Ext.ux.Router Example - Account Manager',
                style: 'line-height:60px; padding-left:10px;'
            }
        },{
            xtype: 'menu',
            region : 'west',
            floating: false,
            split: true,
            width: 127,
            defaults: {
                scope: this,
                handler: this.onMenuItemClick
            },
            items: [{
                text: 'Home',
                uri: ''
            },{
                text: 'Users',
                uri: 'users'
            }]
        },{
            xtype: 'tabpanel',
            id: 'main_tabpanel',
            region: 'center',
            defaults: {closable: true}
        }];
        
        this.callParent();
    },
    
//listeners 
    onMenuItemClick: function(item)
    {
        Ext.ux.Router.redirect(item.uri);
    }
});