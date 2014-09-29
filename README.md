angular-imgcache
================

Simple [imgcache.js](https://github.com/chrisben/imgcache.js) wrapper for AngularJS

## Instalation

Install via bower

```sh
bower install --save https://github.com/jBenes/angular-imgcache.git#master
```

Link library and dependencies

```html
<script src="bower_compoents/angular/angular.js"></script>
<script src="bower_compoents/imgcache.js/js/imgcache.js"></script>
<script src="bower_compoents/angular-imgcache/angular-imgcache.js"></script>
```

Load module

```javascript
angular.module('MyApp', [
    'ImgCache'
])
```

## Usage

You can override imgcache.js default options in Angulars config section.

```javascript
.config(function(..., ImgCacheProvider) {

    // set single options
    ImgCacheProvider.setOption('debug', true);
    ImgCacheProvider.setOption('usePersistentCache', true);

    // or more options at once
    ImgCacheProvider.setOptions({
        debug: true,
        usePersistentCache: true
    });

    ...

});
```

Access imgcache.js and its original methods in your components via promise to make sure that imgcache.js library is already initialized

```javascript
.controller('MyCtrl', function($scope, ImgCache) {

    ImgCache.$promise.then(function() {
        ImgCache.cacheFile('...');
    });

});
```

### TODO

* Directive coming soon