const appConfig = {
    title: "",
    menus: [
        {
            id: "webtop1",
            name: "Webtop1",
            icon: "fas fa-robot",
            url: "/webtop1/",
            active: false
        },
        {
            id: "webtop2",
            name: "Webtop2",
            icon: "fas fa-robot",
            url: "/webtop2/",
            active: false
        },
        {
            id: "webtop3",
            name: "Webtop3",
            icon: "fas fa-robot",
            url: "/webtop3/",
            active: false
        },                 
        { 
            id: 'manage_users',       // ID สำหรับเช็ค Permission ใน DB
            name: 'Admin Panel', 
            icon: 'fas fa-users-cog', 
            url: 'admin-view.html',   // ไฟล์ HTML ที่จะโหลดใส่ Iframe
            adminOnly: true           // (Custom Flag) ระบุว่าเฉพาะ Admin
        }       
    ]
};