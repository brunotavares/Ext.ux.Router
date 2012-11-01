Ext.define('App.view.users.Edit', {
    extend: 'Ext.form.Panel',
    xtype: 'usersedit',
    bodyPadding: 20,
    buttonAlign: 'left',
    defaultType: 'textfield',
    autoScroll: true,
    fieldDefaults: {
        labelWidth: 50,
        msgTarget: 'side'
    },
    items: [{
        xtype: 'button',
        ui: 'plain',
        margin: '0 0 10 0',
        text: '&#171; Back to List',
        href: '#users',
        hrefTarget: '_self'
    },{
        fieldLabel: 'Name',
        name: 'name'
    }, {
        fieldLabel: 'Email',
        name: 'email'
    }, {
        fieldLabel: 'Phone',
        name: 'phone'
    }]
});
