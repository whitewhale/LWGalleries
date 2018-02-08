/**********************************************
 *
 *  Mini Gallery
 *  --------------------
 *  Docs: https://github.com/whitewhale/LWGalleries
 *
 *  Mini gallery displays the first image in the gallery and opens the gallery fullscreen when clicked.
 *
 *  Go to the fullscreen gallery to change fullscreen settings.
 *  These gallery styles and scripts are only loaded when there's a gallery on the page.
 *
  **********************************************
 */
;(function($) {

  var initMiniGalleries = function() {

    // Load the fullscreen gallery plugin once and cache it
    $.ajax({
      url: '/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.js',
      dataType: 'script',
      cache: true
    }).done(function(){

      // If the plugin load is successful, load the fullscreen gallery stylesheet
      $('head').append('<link rel="stylesheet" href="/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.css" type="text/css" />');

      // For each mini gallery on the page
      $('.lw_gallery_mini').each(function() {
        var $this = $(this);

        // Create a fullscreen gallery
        $this.find('.gallery-images').fsgallery({
          title: $this.find('.gallery-title'),       // a text string or jQuery selector containing the gallery title
          caption: $('.caption'),         // a jQuery selector containing each image caption (must be inside list element)
          width: 1000,         // a number denoting the image width. If no width is specified, the original image width will be used.
          autoplay: false,         // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
          pauseOnHover: true,  // pause autoplay when an image is hovered
          trigger: $this.find('.gallery-info'),     // a jQuery selector for an element that opens the gallery when clicked. By default, the gallery opens when the image container is clicked.
        });
      });
    });
  };

  // Initialize galleries on DOM ready
  initMiniGalleries();

  // Run after LiveWhale page edit/save
  $('body').bind('stopEdit.lw', function(){
    initMiniGalleries();
  });

})(livewhale.jQuery);