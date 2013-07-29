Ext.define('Rendering.view.users.List', {
    extend: 'Ext.grid.Panel',
    xtype: 'userslist',
    store: 'Users',
    title: 'Users',
    dockedItems: [{
        xtype: 'toolbar',
        dock: 'top',
        items: ['*Click to view user']
    }],
    columns: [{
        text: 'Name',
        dataIndex: 'name'
    }, {
        text: 'Email',
        dataIndex: 'email',
        flex: 1
    }, {
        text: 'Phone',
        dataIndex: 'phone'
    }]
});