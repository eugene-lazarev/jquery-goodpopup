(function($) {
    "use strict";

    var plugin_suffix = "goodpopup";

    var popup_selector = ".js-goodpopup";
    var popup_inner_selector = ".js-goodpopup-inner-content";
    var popup_close_class = "js-goodpopup-close";
    var popup_active_modificator = "goodpopup_visible";
    var popup_inner_destroy_modificator = "goodpopup-inner-content_destroyed";
    var popup_content_hided_modificator = "goodpopup-inner-content-element_hided";
    var popup_content_hidedfull_modificator = "goodpopup-inner-content-element_hidedfull";
    var popup_content_pseudohided_modificator = "goodpopup-inner-content-element_pseudohided";

    var $popup;
    var $popup_inner;
    
    var is_open = false;

    var popups_list = {};
    var hided_popups_list = [];
    
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

    var throwError = function(popup_name, error_type, additional_data) {
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

        switch(error_type) {
            case "NOT_FOUND":
                var $popup_template = $("#" + popup_name);
                
                if ($popup_template.length > 0) {
                    showError("Please initialize popup `" + popup_name + "`: `$('#" + popup_name + "').goodpopup();`");
                    return $popup_template;
                } else {
                    showError("Popup template `" + popup_name + "` doesn't exist");
                    return popup_name;
                }
                break;
            case "WRONG_OPTIONS":
                showError("Wrong options object in method `setOptions` on popup `" + popup_name + "`");
                return additional_data;
                break;
            default:
                showTrace("Problem with popup");
                return popup_name;
                break;
        }
    };

    var createPopupDOM = function() {
        var popup_html = '<div class="goodpopup js-goodpopup"><div class="goodpopup-inner"><div class="goodpopup-inner-content js-goodpopup-inner-content"></div></div></div>';

        return $(popup_html).appendTo("body").promise().done(function() {
            $popup = $(popup_selector);
            $popup_inner = $popup.find(popup_inner_selector);
        });
    };
    
    var closeButtonMarkup = '<span class="goodpopup-close js-goodpopup-close">' + (helpers.isSVGSupported ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" enable-background="new 0 0 16 16" class="goodpopup-close-svg"><path class="goodpopup-close-svg__path" d="m15.8 13.5l-5.4-5.5 5.5-5.4c.2-.2.2-.6 0-.8l-1.6-1.6c-.1-.1-.3-.2-.4-.2-.2 0-.3.1-.4.2l-5.5 5.4-5.5-5.4c-.1-.1-.2-.2-.4-.2s-.3.1-.4.2l-1.5 1.5c-.2.2-.2.6 0 .8l5.4 5.5-5.5 5.5c0 .1-.1.2-.1.4 0 .2.1.3.2.4l1.6 1.6c.1.1.2.1.4.1.1 0 .3-.1.4-.2l5.4-5.4 5.4 5.5c.1.1.3.2.4.2.1 0 .3-.1.4-.2l1.6-1.6c.1-.1.2-.3.2-.4 0-.2-.1-.3-.2-.4"></path></svg>' : '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAtElEQVRIx6WVyxXFIAgFbwkpkRLSiSVQkiXxFvm+HIGruFOYWYQAAABs6DAI2NNg6Niu64EbDI3C9cw+FQ9uMCiN34o3niv0k93xeYgVOshGoxUjvHkBpfD9CkqqGOF/ZY8VKR4rKNxX0LinmMA5RdoxUsNjBd2vUsPHhWM6NcRphYYfUWs1SBXcj6Qz+O680p3gRSZ6kVLkAyVUyPJIEx4PFOWxXl4s5dX2VujKcn0UurLef0f+APbXjsH9AAAAAElFTkSuQmCC" alt="" class="goodpopup-close__png"/>') + '</span>';

    var renderPopupContentDOM = function(template_html, template_data, hasCloseButton) {
        return '<div class="goodpopup-inner-content-element">' + Handlebars.compile(template_html)(typeof template_data !== "object" ? {} : template_data) + (hasCloseButton ? closeButtonMarkup : '') + '</div>';
    };
    
    var default_options = {
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
            var this_id = $this.attr("id");
            var PopupInstance = popups_list[this_id];
            var options_set = $.extend(true, {}, default_options, options, $this.data());

            if (typeof PopupInstance === "undefined") {
                popups_list[this_id] = new GoodPopup($this, options_set);
            } else {
                PopupInstance.setOptions(options);
            }
        });
    };

    function GoodPopup($template, options_set) {
        var self = this;
        var popup_id = $template.attr("id");
        var options = $.extend(true, {}, options_set);

        var is_rendered = false;
        var is_hided = false;

        var $popup_close;
        var $popup_content;


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
            if (self.getOptions().isOuterClickClosing && $target.parents(".js-goodpopup-inner-content").length === 0 && !$target.hasClass(popup_close_class)) {
                self.close.call(self, self.getOptions().forceClosing.click);
            }
        }
        
        
        /* API */
        this.open = function() {
            if (is_open) {
                if (this.isRendered()) {
                    if (this.isHided()) {
                        $.each(popups_list, function(name, value) {
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
                    $.each(popups_list, function(name, value) {
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
        
        this.close = function(forced_closing) {
            if (!is_open || !this.isRendered()) {
                return this;
            }

            var is_forced_closing = forced_closing || false;
            
            if (hided_popups_list.length > 0) {
                if (is_forced_closing) {
                    for (var i = hided_popups_list.length; i > 0; i--) {
                        hided_popups_list[i - 1]._destroyContent(false);
                    }
                    this._destroyContent(true);
                } else {
                    this._destroyContent(false, function() {
                        hided_popups_list[hided_popups_list.length - 1].getOptions().callbackBeforeOpen.call(hided_popups_list[hided_popups_list.length - 1]);
                        hided_popups_list[hided_popups_list.length - 1]._show.call(hided_popups_list[hided_popups_list.length - 1]);
                    });
                }
            } else {
                this._destroyContent(true);
            }
            
            return this;
        };

        this.isRendered = function() {
            return is_rendered;
        };

        this.isHided = function() {
            return is_hided;
        };

        this.setOptions = function(options_updated) {
            if ($.isPlainObject(options_updated)) {
                if (options_updated.hasOwnProperty("forceClosing") && !$.isPlainObject(options_updated["forceClosing"])) {
                    return throwError(popup_id, "WRONG_OPTIONS", options_updated);
                }

                if (options_updated.hasOwnProperty("hasCloseButton") && options_updated["hasCloseButton"] != self.getOptions().hasCloseButton && self.getPopupContent()) {
                    if (options_updated["hasCloseButton"]) {
                        $popup_content.append(closeButtonMarkup);
                        $popup_close = $popup_content.find("." + popup_close_class);
                        $popup_close.on("click." + plugin_suffix, function() {
                            self.close.call(self, self.getOptions().forceClosing.button);
                        });
                    } else {
                        if (!$popup_close || $popup_close.length === 0) {
                            $popup_close = $popup_content.find("." + popup_close_class);
                        }
                        $popup_close.remove();
                    }
                }
                
                $.extend(true, options, options_updated);

                return this;
            } else {
                return throwError(popup_id, "WRONG_OPTIONS", options_updated);
            }
        };

        this.getOptions = function() {
            return options;
        };

        this.getPopupContent = function() {
            return $popup_content;
        };

        this.getPopupId = function() {
            return popup_id;
        };
        
        
        /* Other methods */
        this._renderContent = function() {
            if (this.isRendered() && !self.getOptions().isIframe && !self.getOptions().isPrerendered) {
                return this;
            }
            
            var afterRender = function() {
                $popup_close = $popup_content.find("." + popup_close_class);
                $popup_close.on("click." + plugin_suffix, function() {
                    self.close.call(self, self.getOptions().forceClosing.button);
                });

                $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, handleKeydown);
                $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, handleOuterClick);

                if (!is_open) {
                    var makeVisible = function() {
                        self.getOptions().callbackAfterOpen.call(self);
                    };
                    
                    $("html").addClass("noscroll");

                    if (helpers.whichTransitionEvent) {
                        $popup.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === $popup[0]) {
                                $popup.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                makeVisible.call(self);
                            }
                        });
                    }
                    $popup.addClass(popup_active_modificator);
                    if (!helpers.whichTransitionEvent) {
                        makeVisible.call(self);
                    }

                    is_rendered = true;
                    is_hided = false;
                    is_open = true;
                } else {
                    var makeVisible = function() {
                        self.getOptions().callbackAfterOpen.call(self);
                    };
                    
                    if (helpers.whichTransitionEvent) {
                        $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === $popup_content[0]) {
                                $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                makeVisible.call(self);
                            }
                        });
                    }
                    setTimeout(function() {
                        $popup_content.removeClass(popup_content_pseudohided_modificator);
                    }, 1);
                    if (!helpers.whichTransitionEvent) {
                        makeVisible.call(self);
                    }

                    is_rendered = true;
                    is_hided = false;
                    is_open = true;
                }
            };
            
            if (!self.getOptions().isPrerendered) {
                if (self.getOptions().isDetachable || self.getOptions().isIframe) {
                    if (typeof $popup_content === "undefined") {
                        $popup_content = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
                    }
                } else {
                    $popup_content = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
                }
            }

            if (is_open) {
                $popup_content.addClass(popup_content_pseudohided_modificator);
            }
            
            if ((!self.getOptions().isPrerendered && !self.getOptions().isIframe) || (self.getOptions().isIframe && !this.isRendered())) {
                $popup_inner.append($popup_content).promise().done(function () {
                    afterRender.call(self);
                });
            } else {
                if (self.getOptions().isPrerendered) {
                    this.setOptions({
                        isPrerendered: false
                    });
                }
                $popup_content.removeClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator);
                afterRender.call(self);
            }

            return this;
        };

        this._rerenderContent = function(afterRerender) {
            var $old_popup_content = $popup_content;

            $popup_close.off("click." + plugin_suffix);

            $popup_content = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
            $popup_content.addClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator);

            $old_popup_content.after($popup_content).promise().done(function() {
                $old_popup_content.remove();

                $popup_close = $popup_content.find("." + popup_close_class);

                if (typeof afterRerender === "function") {
                    afterRerender();
                }
            });
            
            return this;
        };

        this._destroyContent = function(with_shell, afterDestroy) {
            if (!self.isRendered()) {
                return this;
            }

            self.getOptions().callbackBeforeClose.call(self);

            for (var i = 0; i < hided_popups_list.length; i++) {
                if (hided_popups_list[i] === this) {
                    hided_popups_list.splice(i, 1);
                    break;
                }
            }

            if (typeof (with_shell) !== "undefined" && with_shell) {
                var destroy = function() {
                    if (!self.getOptions().isIframe) {
                        if (self.getOptions().isDetachable) {
                            $popup_content.detach().removeClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator + " " + popup_content_pseudohided_modificator + " " + popup_inner_destroy_modificator);
                        } else {
                            $popup_content.remove();
                            $popup_content = undefined;
                        }
                    } else {
                        $popup_content.addClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator).removeClass(popup_inner_destroy_modificator);
                    }
                    
                    self.getOptions().callbackAfterClose.call(self);
                };

                $popup.off("click." + plugin_suffix);
                $(document).off("keydown." + plugin_suffix);
                $popup_close.off("click." + plugin_suffix);

                if (helpers.whichTransitionEvent) {
                    $popup.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                        if (event.target === $popup[0]) {
                            $popup.off(helpers.whichTransitionEvent + ".plugin_suffix");
                            destroy.call(self);
                        }
                    });
                }
                $popup.removeClass(popup_active_modificator);
                if (!helpers.whichTransitionEvent) {
                    destroy.call(self);
                }

                $("html").removeClass("noscroll");

                is_open = false;
                is_hided = false;
                
                if (!self.getOptions().isIframe) {
                    is_rendered = false;
                }
            } else {
                var destroy = function() {
                    if (!self.getOptions().isIframe) {
                        if (self.getOptions().isDetachable) {
                            $popup_content.detach().removeClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator + " " + popup_content_pseudohided_modificator + " " + popup_inner_destroy_modificator);
                        } else {
                            $popup_content.remove();
                            $popup_content = undefined;
                        }
                    } else {
                        $popup_content.addClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator).removeClass(popup_inner_destroy_modificator);
                    }

                    self.getOptions().callbackAfterClose.call(self);
                    
                    if (typeof afterDestroy === "function") {
                        afterDestroy();
                    }
                };

                $popup_close.off("click." + plugin_suffix);
                
                if (is_hided) {
                    is_hided = false;
                    if (!self.getOptions().isIframe) {
                        is_rendered = false;
                    }

                    destroy.call(self);
                } else {
                    if (helpers.whichTransitionEvent) {
                        $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                            if (event.target === $popup_content[0]) {
                                $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix");
                                destroy.call(self);
                            }
                        });
                    }
                    $popup_content.addClass(popup_inner_destroy_modificator);
                    if (!helpers.whichTransitionEvent) {
                        destroy.call(self);
                    }

                    is_hided = false;
                    if (!self.getOptions().isIframe) {
                        is_rendered = false;
                    }
                }
            }
            
            return this;
        };

        this._show = function() {
            if (!is_hided) {
                return this;
            }

            for (var i = 0; i < hided_popups_list.length; i++) {
                if (hided_popups_list[i] === this) {
                    hided_popups_list.splice(i, 1);
                    break;
                }
            }
            
            function show() {
                var makeRetrieved = function() {
                    $(document).off("keydown." + plugin_suffix).on("keydown." + plugin_suffix, handleKeydown);
                    $popup.off("click." + plugin_suffix).on("click." + plugin_suffix, handleOuterClick);
                    $popup_close.off("click." + plugin_suffix).on("click." + plugin_suffix, function() {
                        self.close.call(self, self.getOptions().forceClosing.button);
                    });

                    self.getOptions().callbackAfterOpen.call(self);
                };
                
                if (helpers.whichTransitionEvent) {
                    $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                        if (event.target === $popup_content[0]) {
                            $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix");
                            makeRetrieved.call(self);
                        }
                    });
                }
                setTimeout(function() {
                    $popup_content.removeClass(popup_content_hidedfull_modificator + " " + popup_content_hided_modificator);
                }, 1);
                if (!helpers.whichTransitionEvent) {
                    makeRetrieved.call(self);
                }

                is_hided = false;
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
            if (is_hided) {
                return this;
            }

            self.getOptions().callbackBeforeClose.call(self);

            function makeStealed() {
                $popup_content.addClass(popup_content_hidedfull_modificator);

                self.getOptions().callbackAfterClose.call(self);

                if (typeof afterHide === "function") {
                    afterHide();
                }
            }

            $(document).off("keydown." + plugin_suffix);
            $popup.off("click." + plugin_suffix);
            $popup_close.off("click." + plugin_suffix);

            if (helpers.whichTransitionEvent) {
                $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix").on(helpers.whichTransitionEvent + ".plugin_suffix", function(event) {
                    if (event.target === $popup_content[0]) {
                        $popup_content.off(helpers.whichTransitionEvent + ".plugin_suffix");
                        makeStealed.call(self);
                    }
                });
            }
            $popup_content.addClass(popup_content_hided_modificator);
            if (!helpers.whichTransitionEvent) {
                makeStealed.call(self);
            }

            hided_popups_list.push(self);
            is_hided = true;

            return this;
        };
        
        
        /* Check if pre-render is needed */
        if (self.getOptions().isPrerendered) {
            $popup_content = $(renderPopupContentDOM($template.html(), self.getOptions().data, self.getOptions().hasCloseButton));
            $popup_close = $popup_content.find("." + popup_close_class);
            
            $popup_content.addClass(popup_content_hided_modificator + " " + popup_content_hidedfull_modificator);
            $popup_inner.append($popup_content);
            is_rendered = true;
            is_hided = true;
        }


        /* Set data to DOM elements */
        $template.data("goodpopup", this);
        

        return this;
    }

    $.goodpopup = function(popup_name) {
        if (typeof popups_list[popup_name] !== "undefined") {
            return popups_list[popup_name];
        } else {
            if (typeof popup_name !== "undefined") {
                return throwError(popup_name, "NOT_FOUND");
            } else {
                return this;
            }
        }
    };

    $.goodpopup.getPopups = function() {
        return popups_list;
    };


    /* Init */
    var initPopupTemplates = function() {
        $("script[type='text/x-handlebars-template']").goodpopup();
    };

    $(function() {
        createPopupDOM().done(initPopupTemplates);
    });
}(jQuery));
