/****************************************************************************
 *
 *  Fullscreen Gallery Plugin
 *  -------------------------
 *  Docs: https://github.com/whitewhale/LWGalleries
 *  Author: @nroyall @whitewhale
 *  Licensed under the MIT license

 ****************************************************************************
 */

;(function($) {

  $.widget('lw.fsgallery', {

    // Default options
    options: {
      title: false,           // a text string or jQuery selector containing the gallery title
      caption: false,         // a jQuery selector containing each image caption (must be inside list element)
      width: false,           // a number denoting the image width. If no width is specified, the original image width will be used.
      autoplay: false,        // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
      pauseOnHover: false,    // pause autoplay when an image is hovered
      trigger: false,         // a jQuery selector for an element that opens the gallery when clicked. By default, the gallery opens when the image container is clicked.
      hide: false,            // hide the image container after initializing the gallery.
      destroyOnClose: false  // remove the fullscreen gallery on close
    },

    // Initialize the fullscreen gallery. _create will automatically run the first time this widget is called.
    _create: function() {

      var $body = $('body');
      var self = this; // self allows us to access self.element and self.options within the context of a function

      self.id = Math.floor(1000 + Math.random() * 9000); // assign a random gallery id and store as a global variable

      if ( self.options.autoplay ) { // if autoplay is enabled, set the delay time
        var delay = ( self.options.autoplay != true && self.options.autoplay >= 1 && self.options.autoplay < 4000) ? self.options.autoplay*1000 : 3000;
        self.delay = delay; // store the autoplay delay as a global variable
      }

      // Retrieve images and add them to the list
      var $images = self.element.find('img');
      var $fsgalleryList = $('<ul class="fsgallery-inner"></ul>');

      $images.each( function() {

        var $image = $(this);
        var width = self.options.width;
        var imageSrc = $image.attr('src'); // use the original image source if no width is set

        // If a width is set, create the source for the large version of the image
        if ( width ) {
          var imageWidth = ( width > $image.data('maxW') ) ? $image.data('maxW') : width; // constrain to the the max image width
          var srcBefore = $image.attr('src').substr(0, $image.attr('src').indexOf('width/')+6);
          var srcAfter = $image.attr('src').substr($image.attr('src').lastIndexOf('/'));
          imageSrc = srcBefore+imageWidth+srcAfter; // redefine the image source
        }

        // Get this image caption if there is one (requires the plugin to be called on a list of images)
        var caption = ( self.options.caption && typeof self.options.caption === 'object' ) ? $image.closest('li').find(self.options.caption).text() : '';
        var imageCaption = caption.length > 0 ? '<div class="fsgallery-caption">'+caption+'</div>' : '';

        var imageAlt = ( $image.attr('alt') ) ?  $image.attr('alt') : '';
        var $newImage = $('<li class="fsgallery-image"><img src="'+imageSrc+'" alt="'+imageAlt+'" />'+imageCaption+'</li>');

        // Add the image to the gallery list
        $fsgalleryList.append($newImage);
      });

      // Create fullscreen gallery container for this gallery
      var $fsgallery = $('<div id="gid-'+self.id+'" class="fsgallery" tabindex="-1"><span class="fsgallery-close" tabindex="0 role="button" title="close"></span><div class="fsgallery-nav"><a href="#" class="prev" title="previous image">Prev »</a><a href="#" class="next" title="next image">Next »</a></div><div class="fsgallery-loader is-visible"><div class="fsgallery-loader-line"></div><div class="fsgallery-loader-line"></div><div class="fsgallery-loader-line"></div><div class="fsgallery-loader-line"></div></div></div>').append($fsgalleryList);

      // Add fullscreen gallery to the page
      $fsgallery.appendTo($body);

      // Hide original image container if hide is "true"
      if ( self.options.hide ) {
        self.element.hide();
      }

      // Set the title and trigger options
      self._setOptions({
        'trigger': self.options.trigger,
        'title': self.options.title
      });

      // Make gallery focusable
      $(self.element).attr({
        'tabindex' : '0',
        'role' : 'button',
        'title' : 'Open gallery'
      });

      // Open fullscreen gallery when the image container is clicked. The clicked image displays first.
      $(self.element).on('click', function(e){
        var $clickedImage = $($(e.target).closest('li')).find('img'); // requires the plugin to be called on a list of images (as oppose to any container element)
        self._open( $clickedImage );
      });

      // Open fullscreen gallery if gallery is focused and space or enter is pressed
      $body.keydown(function(e) {

        if ( $(self.element).is(':focus') ) {
          var keyCode = e.which;
          // If pressing space bar or return
          if( keyCode == 13 || keyCode == 32 ) {
            var $clickedImage = $($(e.target).find('li')).find('img').get(0);
            self._open( $clickedImage );
          }
        }
      });

      $(self.element).on('click', function(e){
        var $clickedImage = $($(e.target).closest('li')).find('img'); // requires the plugin to be called on a list of images (as oppose to any container element)
        self._open( $clickedImage );
      });

      // Change image on nav click
      $body.on('click', '#gid-'+self.id+' .fsgallery-nav a', function(e) {

        e.preventDefault();

        var $this = $(this); // 'this' is now the clicked nav element
        var $allImages = $('#gid-'+self.id).find('.fsgallery-image');
        var $subImage;

        if ( $this.hasClass('prev')) {
          $subImage = $allImages.filter('.fsgallery-selected').prev();
          if ( $subImage.length < 1 ) {
            $subImage = $allImages.last();
          }
          self._trigger( 'prevImage' );
        }

        if ( $this.hasClass('next')) {
          $subImage = $allImages.filter('.fsgallery-selected').next();
          if ( $subImage.length < 1 ) {
            $subImage = $allImages.first();
          }
          self._trigger( 'nextImage' );
        }

        // Remove selected class from all images then add it to the substitute image
        $allImages.removeClass('fsgallery-selected');
        $subImage.addClass('fsgallery-selected');

        // Trigger an event when the image changes either direction
        self._trigger( 'changeImage' );

        return true;
      });

      // Detect keypress when fullscreen gallery is open
      $body.keydown(function(e) {

        if (  $body.hasClass('fsgallery-open') ) {
          var keyCode = e.which;
          var $thisGallery = $('#gid-'+self.id);
          var $prevArrow = $thisGallery.find('.fsgallery-nav').find('.prev');
          var $nextArrow = $thisGallery.find('.fsgallery-nav').find('.next');
          var $allImages = $thisGallery.find('.fsgallery-image');
          var $subImage;

          // If arrows keys are pressed switch to next or previous image
          if( keyCode == 37 || keyCode == 38 || keyCode == 39 || keyCode == 40 ) {

            // Stop autoplay if enabled
            if ( self.autoplay ) {
              clearInterval(self.globalFGTimer);
              self.autoplay = false;
            }

            if( keyCode == 37 || keyCode == 38 ) { // left or up
              $subImage = $allImages.filter('.fsgallery-selected').prev();
              $prevArrow.addClass('is-active');
              setTimeout(function(){
                $prevArrow.removeClass('is-active');
              }, 500);

              if ( $subImage.length < 1 ) {
                $subImage = $allImages.last();
              }
            }
            else if( keyCode == 39 || keyCode == 40 ) { // right or down
              $subImage = $allImages.filter('.fsgallery-selected').next();
              $nextArrow.addClass('is-active');
              setTimeout(function(){
                $nextArrow.removeClass('is-active');
              }, 500);
              if ( $subImage.length < 1 ) {
                $subImage = $allImages.first();
              }
            }

            // Remove selected class from all images then add it to the substitute image
            $allImages.removeClass('fsgallery-selected');
            $subImage.addClass('fsgallery-selected');
          }

          // If escape key is pressed, close gallery
          else if(keyCode == 27) { // escape
            self._close(self.id);
          }
        }
      });

      // Close fullscreen gallery when close button is clicked
      $body.on('click', '#gid-'+self.id+' .fsgallery-close', function(){
          self._close();
      });

      // Optionally pause autoplay when gallery nav is hovered
      if ( self.options.pauseOnHover && self.options.autoplay ) {

        // Stop autoplay
        $body.on('mouseenter', '#gid-'+self.id+' .fsgallery-nav a', function() {
          // Stop autoplay if enabled
          if ( self.autoplay ) {
            clearInterval(self.globalFGTimer);
            self.autoplay = false;
          }
        });

        // Restart autoplay if enabled
        $body.on('mouseleave', '#gid-'+self.id+' .fsgallery-nav a', function() {

          if ( !self.autoplay && self.delay ) { // if autoplay isn't already running and autoplay delay is set
            self.autoplay = true;
            self.globalFGTimer = setInterval(function(){
              $('#gid-'+self.id).find('.fsgallery-nav').find('.next').trigger('click'); // prevent slideshow stopping when triggering click
            }, self.delay );
          }


        });
      }
    },


    // Destroy the fullscreen gallery and clean up modifications made to the DOM
    destroy: function () {
      var self = this;
      $('#gid-'+self.id).remove(); // remove this fullscreen gallery
      self.element.show(); // show original image container

      // Stop autoplay if enabled
      if ( self.autoplay ) {
        clearInterval(self.globalFGTimer);
        self.autoplay = false;
      }
    },


    // Opens the fullscreen gallery. If an image is passed it will be displayed first (optional).
    _open: function( $image ) {

      var self = this;
      var $body = $('body');

      // If the gallery is not currently open
      if ( !$body.hasClass('fsgallery-open') ) {

        // Prevent scroll on body element while gallery is open
        $body.addClass('fsgallery-open');

        var $fsgallery = $('#gid-'+self.id).addClass('fsgallery-open').attr('tabindex','0').focus();
        var $allImages = $fsgallery.find('.fsgallery-image');
        var $firstImage = $allImages.first(); // show the first image first by default

        // If an image has been clicked, show the clicked image first
        if ( $image && $image.length ) {
          var imageName = $image.attr('src').substr($image.attr('src').lastIndexOf('/') + 1); // extract the image id and name (when widget is paginated the .rev extension is removed)
          if ( imageName.length ) {
            $firstImage = $allImages.find('img[src*="'+imageName+'"]').parent('.fsgallery-image'); // find this image in our gallery
          }
        }


        // Reveal gallery after the image displayed first has successfully loaded
        $firstImage.imagesLoaded().done(function() {
          $fsgallery.find('.fsgallery-inner').addClass('is-visible');
          $fsgallery.find('.fsgallery-loader').removeClass('is-visible');

          // Start autoplay if enabled
          if ( self.delay ) {

            self.autoplay = true;  // global variable signals that autoplay is running

            self.globalFGTimer = setInterval(function(){ // global variable for the autoplay timer
              $('#gid-'+self.id).find('.fsgallery-nav').find('.next').trigger('click'); // prevent slideshow stopping when triggering click
            }, self.delay );
          }
        }).addClass('fsgallery-selected');
      }

      // Trigger an event when the gallery is opened
      self._trigger( 'open' );
    },


    // Close the fullscreen gallery
    _close: function( ) {

      var self = this;

      // Remove body class to allow other galleries to open
      $('body').removeClass('fsgallery-open');

      // Move focus back to the small gallery
      $(self.element).focus()

      var $fsgallery = $('#gid-'+self.id).removeClass('fsgallery-open').attr('tabindex','-1');

      // Stop autoplay if enabled
      if ( self.autoplay ) {
        clearInterval(self.globalFGTimer);
        self.autoplay = false;
      }

      // Shrink the current image
      var $selectedImage = $fsgallery.find('.fsgallery-selected').addClass('is-closed');

      // Then hide the overlay and remove image class
      $fsgallery.find('fsgallery-inner').removeClass('is-visible');
      $selectedImage.removeClass('is-closed fsgallery-selected');

      // Remove overlay from the DOM if destroyOnClose is "true"
      if ( self.options.destroyOnClose ) {
        self.destroy();
      }

      // Trigger an event when the gallery is closed
      self._trigger( 'close' );
    },


    // Respond to certain changes made to the option method
    _setOption: function ( key, value ) {
      var self = this;
      var fnMap = {
        'trigger': function () {
          if ( value ) {
            self._setTrigger(value);
          }
        },
        'title': function () {
          if ( value ) {
            self._setTitle(value);
          }
        }
      };

      self._super(key, value);

      if (key in fnMap) {
        fnMap[key]();
      }
    },


    // Open fullscreen gallery when the trigger element is clicked
    _setTrigger: function( trigger ) {

      var self = this;

      trigger.on('click', function(){
        self._open();
      });
    },


    // Set the gallery title
    _setTitle: function( title ) {

      var self = this;

      // If title is not "false"
      if ( title ) {

        var $gallery = $('#gid-'+self.id);

        // If title is passed as a jQuery object, transform it to a string first
        var titleString = ( typeof title === 'object' ) ? $.trim(title.text()) : $.trim(title);
        var $currentTitle = $gallery.find('.fsgallery-title');

        if ( titleString.length > 0 && $currentTitle.length ) {
          // Replace existing title
          $currentTitle.text(titleString);
        }
        else if ( titleString.length > 0 ) {
          // or create a new title
          $gallery.prepend($('<span class="fsgallery-title"></span>').append(titleString));
        }
      }
    }
  });

}(livewhale.jQuery));