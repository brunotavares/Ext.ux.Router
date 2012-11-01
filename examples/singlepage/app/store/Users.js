Ext.define('SinglePage.store.Users', {
    extend: 'Ext.data.Store',
    fields: ['name', 'email', 'phone'],
    data: [{
        id: 1,
        name: 'Lisa',
        email: "lisa@simpsons.com",
        phone: "555-111-1224"
    }, {
        id: 2,
        name: 'Bart',
        email: "bart@simpsons.com",
        phone: "555-222-1234"
    }, {
        id: 3,
        name: 'Homer',
        email: "home@simpsons.com",
        phone: "555-222-1244"
    }, {
        id: 4,
        name: 'Marge',
        email: "marge@simpsons.com",
        phone: "555-222-1254"
    }],
    proxy: {
        type: 'memory',
        reader: {
            type: 'json'
        }
    }
});