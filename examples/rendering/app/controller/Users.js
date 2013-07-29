Ext.define('Rendering.controller.Users', {
    extend: 'Rendering.controller.Base',
   
    init: function() {
        this.control({
            'userslist': {
                itemclick: this.onListItemClick
            }
        });
    },
    
    /**
     * Users list. Uses the Rendering.controller.Base
     * render method
     */
    list: function() {
        this.render('userslist');
    },
    
    /**
     * Users edit action. If user is found, render the 
     * form and load the data. Otherwise redirect back to
     * the list.
     * 
     * It uses a custom rendering logic based on the user id,
     * to prevent opening duplicate forms for the same user, while
     * still enabling multiple tabs for different users.
     */
    edit: function(params) {
        var userForm,
            userId  = parseInt(params.id, 10),
            user    = Ext.getStore('Users').getById(userId),
            tabPanel= Ext.getCmp('viewport').child('tabpanel');
            
        if (user) {
            userForm = tabPanel.child('#user-' + userId);
            
            if (!userForm) {
                userForm = tabPanel.add({
                    xtype: 'usersedit',
                    itemId: 'user-' + userId
                });
            }
            
            tabPanel.setActiveTab(userForm);
            userForm.setTitle(user.get('name'));
            userForm.loadRecord(user);
        }
        else {
            Ext.ux.Router.redirect('users/');
        }
    },
    
    onListItemClick: function(list, user) {
        Ext.ux.Router.redirect('users/' + user.getId() + '/edit');
    }
});