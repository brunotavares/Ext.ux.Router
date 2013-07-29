Ext.define('Rendering.view.Viewport', {
    renderTo: Ext.getBody(),
    extend: 'Ext.container.Viewport',
    requires:[
        'Ext.data.TreeStore',
        'Ext.tree.Panel',
        'Ext.tab.Panel',
        'Ext.layout.container.Border'
    ],

    id: 'viewport',
    layout: 'border',
    items: [{
        region: 'west',
        xtype: 'treepanel',
        title: 'Navigation',
        itemId: 'main-nav-tree',
        width: 150,
        rootVisible: false,
        root: {
            expanded: true,
            children: [{
                text: "Home", 
                leaf: true,
                href: '#'
            },{
                text: "Users", 
                leaf: true,
                href: '#users'
            },{ 
                text: "Settings", 
                leaf: true,
                href: '#settings'
            }]
        }
    },{
        region: 'center',
        xtype: 'tabpanel',
        defaults: {
            closable: true
        },
        items:[{
            title: 'Home',
            autoScroll: true,
            closable: false,
            bodyPadding: '20',
            html: [
                '<h1>Ext.ux.Router Custom Rendering Example</h1>',
                '<p>Showcases different ways to render views</p>'
             ]
        }]
    }]
});