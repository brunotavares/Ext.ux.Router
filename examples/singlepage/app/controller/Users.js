Ext.define('SinglePage.controller.Users', {
    extend: 'Ext.app.Controller',
   
    init: function() {
        this.control({
            'userslist': {
                itemclick: this.onListItemClick
            },
            'usersedit': {
                afterrender: this.onEditAfterRender
            }
        });
    },
     
    list: function() {
    },
    
    edit: function(params) {
        this.userId = parseInt(params.id, 10);
    },
    
    onListItemClick: function(list, user) {
        Ext.ux.Router.redirect('users/' + user.getId() + '/edit');
    },
    
    onEditAfterRender: function(editView) {
        var user = Ext.getStore('Users').getById(this.userId);
        delete this.userId;
        
        if (user) {
            editView.loadRecord(user);
        }
    }
});