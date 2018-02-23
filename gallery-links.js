;(function($) {

  var $body = $('body');

  // Function to open gallery detail links as a fullscreen gallery instead
  var initGalleryLinks = function() {

    // Always prevent gallery links from clicking through to details page
    $body.on('click', 'a[href^="/live/galleries/"]', function(e) {
      e.preventDefault();
    });

    // The first time the gallery link is clicked, create the fullscreen gallery and open it
    $body.one('click', 'a[href^="/live/galleries/"]', function(e) {
      e.preventDefault();
      var $galleryLink = $(this);

      // Get the gallery ID
      var galleryID = $galleryLink.attr('href').replace( '/live/galleries/', '' ).split('-')[0];

      // Then use the ID to generate the gallery markup using an inline gallery widget
      var args = {
        id: [{value: galleryID}],
        type: 'mini',
        class: 'lw_hidden'
      };
      var widget = livewhale.lib.getWidgetMarkup(null, 'galleries_inline', args);
      var url = livewhale.liveurl_dir + '/widget/preview/?syntax=' + encodeURIComponent(widget);

      // Use the inline gallery widget to generate the gallery images
      $.get(url, function(images) {

        var $gallery = $(images);

        // Insert the gallery images into the page for use in the fullscreen gallery
        $body.append(images);

        // Load the fullscreen gallery plugin once and cache it
        $.ajax({
          url: '/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.js',
          dataType: 'script',
          cache: true
        }).done(function(){

          // If the plugin load is successful, load the fullscreen gallery stylesheet
          $('head').append('<link rel="stylesheet" href="/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.css" type="text/css" />');

          // Create a fullscreen gallery
          $gallery.find('.gallery-images').fsgallery({
            title: $gallery.find('.gallery-title'),       // a text string or jQuery selector containing the gallery title
            caption: $('.caption'),         // a jQuery selector containing each image caption (must be inside list element)
            width: 1000,         // a number denoting the image width. If no width is specified, the original image width will be used.
            autoplay: false,         // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
            pauseOnHover: true,  // pause autoplay when an image is hovered
            destroyOnClose: false, // make sure the gallery remains in place after closing, in case the link is clicked again
            trigger:  $galleryLink, // subsequent clicks on the gallery link will open the fullscreen gallery
          });

          // Wait a moment for the gallery to load then open the fullscreen gallery for this initial click event
          setTimeout(function(){
            $galleryLink.trigger('click');
          }, 600);
        });
      });
    });
  };

  // Do this on document ready
  initGalleryLinks();


}(livewhale.jQuery));
