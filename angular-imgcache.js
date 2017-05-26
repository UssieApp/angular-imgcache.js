/* globals ImgCache */
angular.module('ImgCache', [])

.provider('ImgCache', function() {

    ImgCache.$init = function() {
        ImgCache.init(function() {
            var $def = ImgCache.$deferred;
            if (!ImgCache.options.cacheDisabled) { $def.resolve(); } else { $def.reject(); }
        }, function() {
            ImgCache.$deferred.reject();
        });
    };

    angular.extend(this, {
        manualInit: false,

        options: ImgCache.options,

        setOptions: function(options) {
            angular.extend(this.options, options);
        },

        setOption: function(name, value) {
            this.options[name] = value;
        },

        disableCache: function(value) {
            this.options.cacheDisabled = value;
        },

        retryCallbackProvider: function(name) {
            this.options.retryCallbackProvider = name;
        },

        $get: ['$q', '$injector', function($q, $injector) {
            ImgCache.$deferred = $q.defer();
            ImgCache.$promise = ImgCache.$deferred.promise;

            if (!this.manualInit) {
                ImgCache.$init();
            }

            return {
                $init: function() {
                    return ImgCache.$init();
                },

                ready: function() {
                    return ImgCache.$promise;
                },

                retryCallback: function() {
                    var providerName = ImgCache.options.retryCallbackProvider;
                    return providerName && $injector.get(providerName) || null;
                },

                internal: function() {
                    return ImgCache;
                },

                getCachedFileURL: function(src) {
                    return $q(function(resolve, reject) {
                        ImgCache.getCachedFileURL(src, function(src, dest) {
                            resolve(dest);
                        }, reject);
                    });
                },

                /**
                 * Resolves with no value if `src` is cached, otherwise rejects.
                 */
                isCached: function(src) {
                    return $q(function(resolve, reject) {
                        ImgCache.isCached(src, function(path, success) {
                            if (success) { resolve(); } else { reject(); }
                        });
                    });
                },

                cacheFile: function(src) {
                    return $q(function(resolve, reject) {
                        ImgCache.cacheFile(src, resolve, reject);
                    });
                }
            };
        }]
    });
})

.directive('imgCache', ['ImgCache', '$q', '$injector', function(ImgCache, $q, $injector) {
    var retryCallback = ImgCache.retryCallback();
    var pending = [];

    function compareEntries(ref) {
        return function(entry) {
            return ref.scope === entry.scope && ref.el === entry.el;
        };
    }

    return {
        restrict: 'A',
        link: function(scope, el, attrs) {

            function retry(entry) {
                // We're already tracking this entry
                if (pending.filter(compareEntries(entry)).length) {
                    return angular.noop;
                }
                pending.push(entry);

                return function(src) {
                    var results = pending.filter(function(entry) {
                        return entry.src === src;
                    });

                    angular.forEach(results, function(entry) {
                        loadImg(entry.type, entry.el)(src);
                        pending.splice(pending.indexOf(entry), 1);
                    });
                };
            }

            function toStyle(url) {
                return { 'background-image': 'url(' + url + ')' };
            }

            function applyImg(type, el, src) {
                return (type === 'bg') ? el.css(toStyle(src)) : el.attr('src', src);
            }

            function setImg(type, el, src) {
                ImgCache.getCachedFileURL(src)
                    .then(function(dest) { applyImg(type, el, dest); });
            }

            var loadImg = function(type, el) {
                return function(src) {
                    if (!src) {
                        return;
                    }
                    var fallback = function(err) {
                        applyImg(type, el, src);
                        if (retryCallback) {
                            $q.when(retryCallback(src, err))
                                .then(retry({ scope: scope, type: type, el: el, src: src }))
                                .catch(function(alt) {
                                    // remove the pending bad src
                                    pending = pending.filter(function(entry) {
                                        return entry.src != src;
                                    });
                                    // load the new url instead
                                    retry({ scope: scope, type: type, el: el, src: alt })(alt);
                                });
                        }
                    };

                    return ImgCache.ready()
                        .then(function() {
                            return ImgCache.isCached(src)
                                .then(function() { return setImg(type, el, src); })
                                .catch(function() {
                                    return ImgCache.cacheFile(src)
                                        .then(function() { setImg(type, el, src); })
                                        .catch(function(err) { fallback(err); });
                                 });
                        })
                        .catch(fallback);
                };
            };

            attrs.$observe('icSrc', loadImg('src', el));
            attrs.$observe('icBg', loadImg('bg', el));

            scope.$on("$destroy", function() {
                pending = pending.filter(function(entry) {
                    return entry.scope !== scope;
                });
            });
        }
    };
}]);
