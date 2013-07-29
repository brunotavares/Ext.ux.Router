Ext.define('Rendering.view.users.Edit', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.form.field.Text',
        'Ext.Button'
    ],
    
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
