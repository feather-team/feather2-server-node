var DOCUMENT_ROOT, STATIC_ROOT, REWRITE_FILE;
var express = require('express');
var router = express.Router();
var path = require('path'), fs = require('fs');
var exists = fs.existsSync || path.existsSync;

function isFile(path){
    return exists(path) && fs.statSync(path).isFile(); 
};

module.exports = function(root, static_root){
    DOCUMENT_ROOT = root;
    STATIC_ROOT = static_root;
    REWRITE_FILE = path.join(DOCUMENT_ROOT, 'conf/rewrite.js');
    ENGINE_FILE = path.join(DOCUMENT_ROOT, 'conf/engine.json');

    router.use(function(req, res, next){
        var config = JSON.parse(fs.readFileSync(ENGINE_FILE));

        if(config.combo && req.originalUrl.indexOf(config.combo.syntax[0]) == 1){
            var combos = req.originalUrl.split(config.combo.syntax[0]);

            if(combos.length > 1){
                //handle combo
                combos = combos[1].split(config.combo.syntax[1]);

                var content = '';

                for(var i = 0, j = combos.length; i < j; i++){
                    var file = path.join(STATIC_ROOT, combos[i]);

                    if(!isFile(file)){
                        res.status(404).end();
                        return;
                    }else{
                        content += fs.readFileSync(file).toString() + '\n'; 
                    }
                }

                res.writeHead(200, {'Content-Type': /(?:css|less|sass)(?:\?|$)/.test(combos[0]) ? 'text/css' : 'text/javascript'});
                res.end(content);
                return;
            }
        }

        var rewrites, url = req.path || '/', file;

        file = path.join(DOCUMENT_ROOT, url);

        try{
            //强制清除加载的文件，重新加载
            delete require.cache[REWRITE_FILE];
            rewrites = require(REWRITE_FILE);
        }catch(e){}

        try{
            if(rewrites){
                for(var key in rewrites){
                    if((new RegExp(key, 'i')).test(req.originalUrl)){
                        url = rewrites[key];

                        if(typeof url == 'function'){
                            url(req, res, next);
                            return;
                        }

                        break;
                    }
                }
            }

            file = path.join(DOCUMENT_ROOT, url);

            if(!isFile(file) && url == '/'){
                file = path.join(DOCUMENT_ROOT, 'index.html');
            }

            if(isFile(file)){   
                var content = fs.readFileSync(file).toString();

                if(url.indexOf('pagelet/') > -1 && 'debug' in req.query){
                    var mapFile = path.join(DOCUMENT_ROOT, 'map.json');
                    var mapJson = JSON.parse(fs.readFileSync(mapFile));

                    content = '<script src="' + mapJson['static/feather.js'].url + '"></script>' + content;
                }
                
                res.send(content); 
            }
        }catch(e){
            res.status(500).send(e.message);
        }

        next();
    });

    return router;
};