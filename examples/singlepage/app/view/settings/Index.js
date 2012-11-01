Ext.define('App.view.settings.Index', {
    extend: 'Ext.form.Panel',
    bodyPadding: 20,
    buttonAlign: 'left',
    autoScroll: true,
    fieldDefaults: {
        labelAlign: 'right',
        labelWidth: 85,
        msgTarget: 'side'
    },
    items: [{
        xtype: 'fieldset',
        title: 'Contact Information',
        defaultType: 'textfield',
        defaults: {
            width: 280
        },
        items: [{
            fieldLabel: 'First Name',
            emptyText: 'First Name',
            name: 'first'
        }, {
            fieldLabel: 'Last Name',
            emptyText: 'Last Name',
            name: 'last'
        }, {
            fieldLabel: 'Company',
            name: 'company'
        }, {
            fieldLabel: 'Email',
            name: 'email',
            vtype: 'email'
        }, {
            xtype: 'combobox',
            fieldLabel: 'State',
            name: 'state',
            emptyText: 'Select a state...',
            store: []
        }, {
            xtype: 'datefield',
            fieldLabel: 'Date of Birth',
            name: 'dob',
            allowBlank: false,
            maxValue: new Date()
        }]
    }],
    buttons: [{
        text: 'Load'
    }, {
        text: 'Submit',
        disabled: true,
        formBind: true    
    }]
});
