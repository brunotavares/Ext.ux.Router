Ext.define('AM.view.user.List' ,{
    extend: 'Ext.grid.Panel',
    alias : 'widget.userlist',
    store: 'Users',
    title : 'All Users',

    initComponent: function() 
    {
        var me= this;
        me.columns = [
            {header: 'Name',  dataIndex: 'name',  flex: 1},
            {header: 'Email', dataIndex: 'email', flex: 1}
        ];
        me.dockedItems = [{
            xtype: 'toolbar',
            dock: 'bottom',
            items: [{
                xtype: 'tbtext',
                text: '*double click to edit'
            }]
        }];
        
        me.callParent(arguments);
    }
});