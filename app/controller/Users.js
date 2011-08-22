Ext.define('AM.controller.Users', {
    extend: 'Ext.app.Controller',
    views: ['user.List', 'user.Edit'],
    stores: ['Users'],
    models: ['User'],

//init
    init: function()
    {
       this.control({
           'userlist': {
               itemdblclick: this.onListRowDblClick
            },
            'useredit button[action=save]': {
                click: this.onBtnUpdateClick
            }
            
        });
    },
    
//actions
    list: function()
    {
        this.render('user.List');
    },

    edit: function(params)
    {
        var view,
            store = this.getUsersStore(),
            record = store.getById(params.id);
            
        if(!record)
        {    
            store.load({
                scope: this,
                callback: function(){ this.edit(params); }
            });
            return;
        }
        
        view = Ext.widget('useredit');
        view.down('form').loadRecord(record);
    },
    
//listeners
   onListRowDblClick: function(userList, record)
   {
       Ext.ux.Router.redirect('users/' + record.getId() + '/edit');
   },
   
   onBtnUpdateClick: function(button)
   {
        var win = button.up('window'),
            form = win.down('form'),
            record = form.getRecord(),
            values = form.getValues();

        record.set(values);
        win.close();
   }
});