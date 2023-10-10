import fs from "fs";

function createServerFile(done) {
    if (fs.existsSync("server.js")) {
      console.log("Plik server.js już istnieje. Nie nadpisuję.");
      done();
      return;
    }
  
    const content = `const path = require('path');
  
    const express = require('express');
    
    const blogRoutes = require('./routes/link');
    const db = require('./data/database');
    
    const app = express();
    
    // Activate EJS view engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    app.use(express.urlencoded({ extended: true })); // Parse incoming request bodies
    app.use('/dist',express.static('dist')); // Serve static files (e.g. CSS files)
    
    app.use(blogRoutes);
    
    app.use(function (error, req, res, next) {
      // Default error handling function
      // Will become active whenever any route / middleware crashes
      console.log(error);
      res.status(500).render('500');
    });
    
    db.connectToDatabase().then(function () {
      app.listen(3005);
    });
    `;
  
    fs.writeFileSync("server.js", content, "utf8");
    console.log("Plik server.js został utworzony.");
    done();
  }

  export{createServerFile}