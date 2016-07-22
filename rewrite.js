var DOCUMENT_ROOT, STATIC_ROOT, REWRITE_FILE;
var express = require('express');
var router = express.Router();
var path = require('path'), fs = require('fs');
var exists = path.existsSync || fs.existsSync;

module.exports = function(root, static_root){
    DOCUMENT_ROOT = root;
    STATIC_ROOT = static_root;
    REWRITE_FILE = path.join(DOCUMENT_ROOT, 'conf/rewrite.js');

    router.use(function(req, res, next){
        var combos = req.originalUrl.split('??');

        if(combos.length > 1){
            combos = combos[1].split(',');

            var content = '';

            for(var i = 0, j = combos.length; i < j; i++){
                var file = path.join(STATIC_ROOT, combos[i]);

                if(!exists(file)){
                    res.status(404).end();
                }else{
                    content += fs.readFileSync(file).toString(); 
                }
            }

            res.send(content);
            next();
            return;
        }

        var rewrites, url = req.path, file;

        if(url == '' || url == '/'){
            url = 'index.html';
        }

        file = path.join(DOCUMENT_ROOT, url);

        if(exists(file)){
            res.send(fs.readFileSync(file).toString());
            next();
            return;
        }

        try{
            rewrites = require(REWRITE_FILE);
        }catch(e){}

        try{
            if(rewrites){
                for(var key in rewrites){
                    if((new RegExp(key, 'i')).test(req.originalUrl)){
                        url = rewrites[key];
                        break;
                    }
                }
            }

            file = path.join(DOCUMENT_ROOT, url);

            if(!exists(file)){
                res.status(404);
            }else{
                res.send(fs.readFileSync(file).toString()); 
            }
        }catch(e){
            res.status(500).send(e.message);
        }

        next();
    });

    return router;
};