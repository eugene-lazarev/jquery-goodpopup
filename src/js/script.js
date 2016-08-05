(function($) {
    "use strict";

    var pluginSuffix = "goodpopup";

    var popupSelector = ".js-goodpopup";
    var popupInnerSelector = ".js-goodpopup-inner-content";
    var popupCloseClass = "js-goodpopup-close";
    var popupActiveModificator = "goodpopup_visible";
    var popupInnerDestroyModificator = "goodpopup-inner-content_destroyed";
    var popupContentHidedModificator = "goodpopup-inner-content-element_hided";
    var popupContentHidedfullModificator = "goodpopup-inner-content-element_hidedfull";
    var popupContentPseudohidedModificator = "goodpopup-inner-content-element_pseudohided";

    var $popup;
    var $popupInner;
    
    var isOpen = false;

    var popupsList = {};
    var hidedPopupsList = [];
    
    var helpers = {
        isSVGSupported: (function() {
            function checkSVGSupport() {
                /* https://css-tricks.com/a-complete-guide-to-svg-fallbacks/ */
                var div = document.createElement("div");
                div.innerHTML = "<svg/>";
                return (div.firstChild && div.firstChild.namespaceURI) == "http://www.w3.org/2000/svg";
            }
            
            return !!((typeof Modernizr === "object" && typeof Modernizr.inlinesvg === "boolean" && Modernizr.inlinesvg) || checkSVGSupport());
        })(),
        
        whichTransitionEvent: (function() {
            var t;
            var el = document.createElement("div");
            var transitions = {
                "transition": "transitionend",
                "OTransition": "oTransitionEnd",
                "MozTransition": "transitionend",
                "MSTransition" : "msTransitionEnd",
                "WebkitTransition": "webkitTransitionEnd"
            };
    
            for (t in transitions) {
                if (typeof el.style[t] !== "undefined") {
                    return transitions[t];
                }
            }
    
            return false;
        })()
    };

    var throwError = function(popupName, errorType, additionalData) {
        function showError(text) {
            if (typeof console !== "undefined" && typeof console.error === "function") {
                console.error(text);
            } else {
                alert(text);
            }
        }

        function showTrace(text) {
            if (typeof console !== "undefined" && typeof console.trace === "function") {
                console.trace(text);
            } else {
                alert(text);
            }
        }

        switch(errorType) {
            case "NOT_FOUND":
                var $popupTemplate = $("#" + popupName);
                
                if ($popupTemplate.length > 0) {
                    showError("Please initialize popup `" + popupName + "`: `$('#" + popupName + "').goodpopup();`");
                    return $popupTemplate;
                } else {
                    showError("Popup template `" + popupName + "` doesn't exist");
                    return popupName;
                }
                break;
            case "WRONG_OPTIONS":
                showError("Wrong options object in method `setOptions` on popup `" + popupName + "`");
                return additionalData;
                break;
            default:
                showTrace("Problem with popup");
                return popupName;
                break;
        }
    };

    var createPopupDOM = function() {
        var popupHTML = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

        return $(popupHTML).appendTo("body").promise().done(function() {
            $popup = $(popupSelector);
            $popupInner = $popup.find(popupInnerSelector);
        });
    };
    
    var closeButtonMarkup = '<span class="goodpopup-close js-goodpopup-close">' + (helpers.isSVGSupported ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" enable-background="new 0 0 16 16" class="goodpopup-close-svg"><path class="goodpopup-close-svg__path" d="m15.8 13.5l-5.4-5.5 5.5-5.4c.2-.2.2-.6 0-.8l-1.6-1.6c-.1-.1-.3-.2-.4-.2-.2 0-.3.1-.4.2l-5.5 5.4-5.5-5.4c-.1-.1-.2-.2-.4-.2s-.3.1-.4.2l-1.5 1.5c-.2.2-.2.6 0 .8l5.4 5.5-5.5 5.5c0 .1-.1.2-.1.4 0 .2.1.3.2.4l1.6 1.6c.1.1.2.1.4.1.1 0 .3-.1.4-.2l5.4-5.4 5.4 5.5c.1.1.3.2.4.2.1 0 .3-.1.4-.2l1.6-1.6c.1-.1.2-.3.2-.4 0-.2-.1-.3-.2-.4"></path></svg>' : '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAtElEQVRIx6WVyxXFIAgFbwkpkRLSiSVQkiXxFvm+HIGruFOYWYQAAABs6DAI2NNg6Niu64EbDI3C9cw+FQ9uMCiN34o3niv0k93xeYgVOshGoxUjvHkBpfD9CkqqGOF/ZY8VKR4rKNxX0LinmMA5RdoxUsNjBd2vUsPHhWM6NcRphYYfUWs1SBXcj6Qz+O680p3gRSZ6kVLkAyVUyPJIEx4PFOWxXl4s5dX2VujKcn0UurLef0f+APbXjsH9AAAAAElFTkSuQmCC" alt="" class="goodpopup-close__png"/>') + '</span>';

    var renderPopupContentDOM = function(templateHTML, templateData, hasCloseButton) {
        return '<div class="goodpopup-inner-content-element">' + Handlebars.compile(templateHTML)(typeof templateData !== "object" ? {} : templateData) + (hasCloseButton ? closeButtonMarkup : '') + '</div>';
    };
    
    var defaultOptions = {
        callbackBeforeOpen: function() {},
        callbackAfterOpen: function() {},

        callbackBeforeClose: function() {},
        callbackAfterClose: function() {},

        isPrerendered: false,
        isIframe: false,
        
        isDetachable: false,
        isOuterClickClosing: true,
        hasCloseButton: true,

        keyCodeForClosing: 27,

        forceClosing: {
            click: true,
            keydown: true,
            button: false
        },

        data: {}
    };

    $.fn.goodpopup = function(options) {
        return this.each(function(i, element) {
            var $this = $(element);
            var thisID = $this.attr("id");
            var PopupInstance = popupsList[thisID];
            var optionsSet = $.extend(true, {}, defaultOptions, options, $this.data());

            if (typeof PopupInstance === "undefined") {
                popupsList[thisID] = new GoodPopup($this, optionsSet);
            } else {
                PopupInstance.setOptions(options);
            }
        });
    };

    function GoodPopup($template, optionsSet) {
        var self = this;
        var popupID = $template.attr("id");
        var options = $.extend(true, {}, optionsSet);

        var isRendered = false;
        var isHided = false;

        var $popupClose;
        var $popupContent;


        /* Helpers */
        function handleKeydown(event) {
            var keyForClosing = self.getOptions().keyCodeForClosing;
            
            if (typeof keyForClosing === "number") {
                self.setOptions({
                    keyCodeForClosing: [keyForClosing]
                });
                keyForClosing = self.getOptions().keyCodeForClosing
            }
            
            for (var i = 0; i < keyForClosing.length; i++) {
                if (event.keyCode === keyForClosing[i]) {
                    self.close.call(self, self.getOptions().forceClosing.keydown);
                }
            }
        }

        function handleOuterClick(event) {
            var $target = $(event.target);
            if (self.getOptions().isOuterClickClosing && $target.parents(".js-goodpopup-inner-content").length === 0 && !$target.hasClass(popupCloseClass)) {
                self.close.call(self, self.getOptions().forceClosing.click);
            }
        }
        
        
        /* API */
        this.open = function() {
            if (isOpen) {
                if (this.isRendered()) {
                    if (this.isHided()) {
                        $.each(popupsList, function(name, value) {
                            if (value.isRendered() && !value.isHided()) {
                                value._hide(function() {
                                    self.getOptions().callbackBeforeOpen.call(self);
                                    self._show.call(self);
                                });
                                return false;
                            }
                        });
                    } else {
                        return this;
                    }
                } else {
                    $.each(popupsList, function(name, value) {
                        if (value.isRendered() && !value.isHided()) {
                            value._hide(function() {
                                self.getOptions().callbackBeforeOpen.call(self);
                                self._renderContent.call(self);
                            });
                            return false;
                        }
                    });
                }
            } else {
                self.getOptions().callbackBeforeOpen.call(self);
                self._renderContent.call(self);
            }
            
            return this;
        };
        
        this.close = function(forcedClosing) {
            if (!isOpen || !this.isRendered()) {
                return this;
            }

            var isForcedClosing = forcedClosing || false;
            
            if (hidedPopupsList.length > 0) {
                if (isForcedClosing) {
                    for (var i = hidedPopupsList.length; i > 0; i--) {
                        hidedPopupsList[i - 1]._destroyContent(false);
                    }
                    this._destroyContent(true);
                } else {
                    this._destroyContent(false, function() {
                        hidedPopupsList[hidedPopupsList.length - 1].getOptions().callbackBeforeOpen.call(hidedPopupsList[hidedPopupsList.length - 1]);
                        hidedPopupsList[hidedPopupsList.length - 1]._show.call(hidedPopupsList[hidedPopupsList.length - 1]);
                    });
                }
            } else {
                this._destroyContent(true);
            }
            
            return this;
        };

        this.isRendered = function() {
            return isRendered;
        };

        this.isHided = function() {
            return isHided;
        };

        this.setOptions = function(optionsUpdated) {
            if ($.isPlainObject(optionsUpdated)) {
                if (optionsUpdated.hasOwnProperty("forceClosing") && !$.isPlainObject(optionsUpdated["forceClosing"])) {
                    return throwError(popupID, "WRONG_OPTIONS", optionsUpdated);
                }

                if (optionsUpdated.hasOwnProperty("hasCloseButton") && optionsUpdated["hasCloseButton"] != self.getOptions().hasCloseButton && self.getPopupContent()) {
                    if (optionsUpdated["hasCloseButton"]) {
                        $popupContent.append(closeButtonMarkup);
                        $popupClose = $popupContent.find("." + popupCloseClass);
                        $popupClose.on("click." + pluginSuffix, function() {
                            self.close.call(self, self.getOptions().forceClosing.button);
                        });
                    } else {
                        if (!$popupClose || $popupClose.length === 0) {
                            $popupClose = $popupContent.find("." + popupCloseClass);
                        }
                        $popupClose.remove();
                    }
                }
                
                $.extend(true, options, optionsUpdated);

                return this;
            } else {
                return throwError(popupID, "WRONG_OPTIONS", optionsUpdated);
            }
        };

        this.getOptions = function() {
            return options;
        };

        this.getPopupContent = function() {
            return $popupContent;
        };

        this.getPopupId = function() {
            return popupID;
        };
        
        
        /* Other methods */
        this._renderContent = function() {
            if (this.isRendered() && !self.getOptions().isIframe && !self.getOptions().isPrerendered) {
                return this;
            }
            
            var afterRender = function() {
                $popupClose = $popupContent.find("." + popupCloseClass);
                $popupClose.on("click." + pluginSuffix, function() {
                    self.close.call(self, self.getOptions().forceClosing.button);
                });

                $(document).off("keydown." + pluginSuffix).on("keydown." + pluginSuffix, handleKeydown);
                $popup.off("click." + pluginSuffix).on("click." + pluginSuffix, handleOuterClick);

                if (!isOpen) {
                    var makeVisible = function() {
                        self.getOptions().callbackAfterOpen.call(self);
                    };
                    
                    $("html").addClass("noscroll");

                    if (helpers.whichTransitionEvent) {
                        $popup.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === $popup[0]) {
                                $popup.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                makeVisible.call(self);
                            }
                        });
                    }
                    $popup.addClass(popupActiveModificator);
                    if (!helpers.whichTransitionEvent) {
                        makeVisible.call(self);
                    }

                    isRendered = true;
                    isHided = false;
                    isOpen = true;
                } else {
                    var makeVisible = function() {
                        self.getOptions().callbackAfterOpen.call(self);
                    };
                    
                    if (helpers.whichTransitionEvent) {
                        $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === $popupContent[0]) {
                                $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                makeVisible.call(self);
                            }
                        });
                    }
                    setTimeout(function() {
                        $popupContent.removeClass(popupContentPseudohidedModificator);
                    }, 1);
                    if (!helpers.whichTransitionEvent) {
                        makeVisible.call(self);
                    }

                    isRendered = true;
                    isHided = false;
                    isOpen = true;
                }
            };
            
            if (!self.getOptions().isPrerendered) {
                if (self.getOptions().isDetachable || self.getOptions().isIframe) {
                    if (typeof $popupContent === "undefined") {
                        $popupContent = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
                    }
                } else {
                    $popupContent = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
                }
            }

            if (isOpen) {
                $popupContent.addClass(popupContentPseudohidedModificator);
            }
            
            if ((!self.getOptions().isPrerendered && !self.getOptions().isIframe) || (self.getOptions().isIframe && !this.isRendered())) {
                $popupInner.append($popupContent).promise().done(function () {
                    afterRender.call(self);
                });
            } else {
                if (self.getOptions().isPrerendered) {
                    this.setOptions({
                        isPrerendered: false
                    });
                }
                $popupContent.removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);
                afterRender.call(self);
            }

            return this;
        };

        this._rerenderContent = function(afterRerender) {
            var $oldPopupContent = $popupContent;

            $popupClose.off("click." + pluginSuffix);

            $popupContent = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
            $popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);

            $oldPopupContent.after($popupContent).promise().done(function() {
                $oldPopupContent.remove();

                $popupClose = $popupContent.find("." + popupCloseClass);

                if (typeof afterRerender === "function") {
                    afterRerender();
                }
            });
            
            return this;
        };

        this._destroyContent = function(withShell, afterDestroy) {
            if (!self.isRendered()) {
                return this;
            }

            self.getOptions().callbackBeforeClose.call(self);

            for (var i = 0; i < hidedPopupsList.length; i++) {
                if (hidedPopupsList[i] === this) {
                    hidedPopupsList.splice(i, 1);
                    break;
                }
            }

            if (typeof (withShell) !== "undefined" && withShell) {
                var destroy = function() {
                    if (!self.getOptions().isIframe) {
                        if (self.getOptions().isDetachable) {
                            $popupContent.detach().removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator + " " + popupContentPseudohidedModificator + " " + popupInnerDestroyModificator);
                        } else {
                            $popupContent.remove();
                            $popupContent = undefined;
                        }
                    } else {
                        $popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator).removeClass(popupInnerDestroyModificator);
                    }
                    
                    self.getOptions().callbackAfterClose.call(self);
                };

                $popup.off("click." + pluginSuffix);
                $(document).off("keydown." + pluginSuffix);
                $popupClose.off("click." + pluginSuffix);

                if (helpers.whichTransitionEvent) {
                    $popup.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                        if (event.target === $popup[0]) {
                            $popup.off(helpers.whichTransitionEvent + ".pluginSuffix");
                            destroy.call(self);
                        }
                    });
                }
                $popup.removeClass(popupActiveModificator);
                if (!helpers.whichTransitionEvent) {
                    destroy.call(self);
                }

                $("html").removeClass("noscroll");

                isOpen = false;
                isHided = false;
                
                if (!self.getOptions().isIframe) {
                    isRendered = false;
                }
            } else {
                var destroy = function() {
                    if (!self.getOptions().isIframe) {
                        if (self.getOptions().isDetachable) {
                            $popupContent.detach().removeClass(popupContentHidedModificator + " " + popupContentHidedfullModificator + " " + popupContentPseudohidedModificator + " " + popupInnerDestroyModificator);
                        } else {
                            $popupContent.remove();
                            $popupContent = undefined;
                        }
                    } else {
                        $popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator).removeClass(popupInnerDestroyModificator);
                    }

                    self.getOptions().callbackAfterClose.call(self);
                    
                    if (typeof afterDestroy === "function") {
                        afterDestroy();
                    }
                };

                $popupClose.off("click." + pluginSuffix);
                
                if (isHided) {
                    isHided = false;
                    if (!self.getOptions().isIframe) {
                        isRendered = false;
                    }

                    destroy.call(self);
                } else {
                    if (helpers.whichTransitionEvent) {
                        $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                            if (event.target === $popupContent[0]) {
                                $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                                destroy.call(self);
                            }
                        });
                    }
                    $popupContent.addClass(popupInnerDestroyModificator);
                    if (!helpers.whichTransitionEvent) {
                        destroy.call(self);
                    }

                    isHided = false;
                    if (!self.getOptions().isIframe) {
                        isRendered = false;
                    }
                }
            }
            
            return this;
        };

        this._show = function() {
            if (!isHided) {
                return this;
            }

            for (var i = 0; i < hidedPopupsList.length; i++) {
                if (hidedPopupsList[i] === this) {
                    hidedPopupsList.splice(i, 1);
                    break;
                }
            }
            
            function show() {
                var makeRetrieved = function() {
                    $(document).off("keydown." + pluginSuffix).on("keydown." + pluginSuffix, handleKeydown);
                    $popup.off("click." + pluginSuffix).on("click." + pluginSuffix, handleOuterClick);
                    $popupClose.off("click." + pluginSuffix).on("click." + pluginSuffix, function() {
                        self.close.call(self, self.getOptions().forceClosing.button);
                    });

                    self.getOptions().callbackAfterOpen.call(self);
                };
                
                if (helpers.whichTransitionEvent) {
                    $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                        if (event.target === $popupContent[0]) {
                            $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                            makeRetrieved.call(self);
                        }
                    });
                }
                setTimeout(function() {
                    $popupContent.removeClass(popupContentHidedfullModificator + " " + popupContentHidedModificator);
                }, 1);
                if (!helpers.whichTransitionEvent) {
                    makeRetrieved.call(self);
                }

                isHided = false;
            }

            if (!self.getOptions().isDetachable && !self.getOptions().isIframe) {
                self._rerenderContent.call(self, function() {
                    show.call(self);
                });
            } else {
                show.call(self);
            }

            return this;
        };
        
        this._hide = function(afterHide) {
            if (isHided) {
                return this;
            }

            self.getOptions().callbackBeforeClose.call(self);

            function makeStealed() {
                $popupContent.addClass(popupContentHidedfullModificator);

                self.getOptions().callbackAfterClose.call(self);

                if (typeof afterHide === "function") {
                    afterHide();
                }
            }

            $(document).off("keydown." + pluginSuffix);
            $popup.off("click." + pluginSuffix);
            $popupClose.off("click." + pluginSuffix);

            if (helpers.whichTransitionEvent) {
                $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix").on(helpers.whichTransitionEvent + ".pluginSuffix", function(event) {
                    if (event.target === $popupContent[0]) {
                        $popupContent.off(helpers.whichTransitionEvent + ".pluginSuffix");
                        makeStealed.call(self);
                    }
                });
            }
            $popupContent.addClass(popupContentHidedModificator);
            if (!helpers.whichTransitionEvent) {
                makeStealed.call(self);
            }

            hidedPopupsList.push(self);
            isHided = true;

            return this;
        };
        
        
        /* Check if pre-render is needed */
        if (self.getOptions().isPrerendered) {
            $popupContent = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
            $popupClose = $popupContent.find("." + popupCloseClass);
            
            $popupContent.addClass(popupContentHidedModificator + " " + popupContentHidedfullModificator);
            $popupInner.append($popupContent);
            isRendered = true;
            isHided = true;
        }


        /* Set data to DOM elements */
        $template.data("goodpopup", this);
        

        return this;
    }

    $.goodpopup = function(popupName) {
        if (typeof popupsList[popupName] !== "undefined") {
            return popupsList[popupName];
        } else {
            if (typeof popupName !== "undefined") {
                return throwError(popupName, "NOT_FOUND");
            } else {
                return this;
            }
        }
    };

    $.goodpopup.getPopups = function() {
        return popupsList;
    };
    
    $.goodpopup.version = "2.0.0-beta.13";


    /* Init */
    var initPopupTemplates = function() {
        $("script[type='text/x-handlebars-template']").goodpopup();
    };

    $(function() {
        createPopupDOM().done(initPopupTemplates);
    });
}(jQuery));
