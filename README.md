# LWGalleries
A collection of galleries to use with LiveWhale CMS.

## Installation
Add the galleries folder to your **global** theme:

    /www/_ingredients/themes/global/galleries/

Add the inline gallery format file to your theme:

    www/livewhale/theme/global/widgets/galleries_inline.format.html

Open the public config file:

    /livewhale/client/public.config.php

Find the following line and unncomment it.
Set the gallery image size about the width of the space you want to fill: this could be the width of your main content area if you're only showing one large image at a time, or your page sidebar:

    $_LW->REGISTERED_WIDGETS['galleries']['custom']['inline_width']=420; // default width of inline gallery images (default: 300)

Clicking a link to a gallery details page opens the gallery on a separate page (which needs styling).

If you wish to avoid this and **always** show galleries in a fullscreen overlay, add this script to your theme:

    /www/_ingredients/themes/global/scripts/gallery-links.js


Lastly, to prevent the default LiveWhale gallery types appearing in LiveWhale, add the following files to your ingredients folder:

    /www/_ingredients/themes/global/styles/livewhale.less
    /www/_ingredients/backend/backend.less


<br/><br/>
---
## Custom Styling
Customize the gallery styles by changing the LESS variables in:

    /www/_ingredients/themes/global/galleries/all-custom-gallery-variables.less

<br/><br/>
---

## Gallery Types: 
### Mini Gallery
Mini gallery displays the first image in the gallery and opens the gallery fullscreen when clicked.
These gallery styles and scripts are only loaded when there's a gallery on the page.

Go to the fullscreen gallery to change the fullscreen settings.

<br/><br/>
---

### Carousel Gallery

Carousel gallery displays a slideshow of images that opens fullscreen when clicked.
These gallery styles and scripts are only loaded when there's a gallery on the page.


#### Carousel Options
Add these classes to the gallery widget to change the appearance.

###### Autoplay
_Scrolls through the carousel images automatically. This will hide the image captions._

    <arg id="class">autoplay</arg>


###### Show Navigation Dots

    <arg id="class">dots</arg>


###### Hide Image Captions

    <arg id="class">no-captions</arg>


###### Hide Arrows

    <arg id="class">no-arrows</arg>


###### Hide Gallery Title

    <arg id="class">no-title</arg>

<br/>
Go to the fullscreen gallery to change the fullscreen settings.

### Acknowledgements
This gallery uses BoxSlider to display images
Source: BxSlider v4.1.2
Written by: Steven Wanderski, 2014
http://stevenwanderski.com
http://bxslider.com/examples/carousel-dynamic-number-slides


<br/><br/>
---

### Fullscreen Gallery
A responsive and accessible fullscreen gallery plugin.

The plugin cannot be used as an inline gallery by itself but it can be called on an inline gallery. The plugin styles and scripts must be loaded before calling the plugin.


#### Usage:
Call the plugin on a list of images. Each image must be wrapped inside an `<li>` element, and all the images must be inside a `<ul>` container.

`$('#lw_gallery_thumbnails').fsgallery();`


You can call the plugin on an inline gallery that contains a list of images. Users can click the inline gallery to see larger images. Adapt the following code for your inline gallery, and place it in your inline gallery JS file:

    ;(function($) {

      var $body = $('body');

      // Load the fullscreen gallery plugin once and cache it
      $.ajax({
        url: '/live/resource/css/_ingredients/themes/global/galleries/fullscreen/fullscreen.js',
        dataType: 'script',
        cache: true
      }).done(function(){

        // If the plugin load is successful, load the fullscreen gallery stylesheet
        $('head').append('<link rel="stylesheet" href="/_ingredients/extras/fullscreen-gallery.min.css" type="text/css" />');

        // Then create a fullscreen gallery for each mini gallery on the page
        var initGalleries = function() {
          $('.lw_gallery_mini').each(function() { // loop through each gallery so we can find the title for each one
            var $this = $(this);
            $this.find('.gallery-images').fsgallery({
              title: $this.find('.gallery-title'),       // a text string or jQuery selector containing the gallery title
              caption: $('.caption'),         // a jQuery selector containing each image caption (must be inside list element)
              width: 1000,         // a number denoting the image width. If no width is specified, the original image width will be used.
              autoplay: 2.5,         // number of seconds to wait between images, or set to true for default speed (3s). Autoplay will stop when nav buttons are clicked.
              pauseOnHover: true,  // pause autoplay when an image is hovered
              trigger: $this.find('.gallery-info'),     // a jQuery selector for an element that opens the gallery when clicked. By default, the gallery opens when the image container is clicked.
            });
          });
        };

        // Initialize fullscreen galleries on DOM ready
        initGalleries();

        // And after LiveWhale page edit/save
        $body.bind('stopEdit.lw', function(){
          initGalleries();
        });

        // And after widget pagination
        $body.bind('paginate.lw', function(){
          initGalleries();
        });
      });

    })(livewhale.jQuery);



#### Fullscreen Gallery Options:

###### Title

_Type: String or Selector_

A text string or jQuery selector containing the gallery title.

    $('#lw_gallery_thumbnails').fsgallery({
      title: $('.page-title')
    });


###### Caption

_Type: Selector_

A jQuery selector containing each image caption. The caption must be placed inside the `<li>` list element along with the image.

    $('#lw_gallery_thumbnails').fsgallery({
      caption: $('.lw_image_caption')
    });


###### Width

_Type: Number_

A number denoting the image width. If no width is specified, the original image width will be used.

    $('#lw_gallery_thumbnails').fsgallery({
      width: 1000
    });


###### Autoplay

_Type: Boolean or Number_

The number of seconds to wait between images. Set to _true_ to turn on autoplay with the default speed (3s).
Autoplay will stop when the navigation buttons are clicked.

    $('#lw_gallery_thumbnails').fsgallery({
      autoplay: true
    });


###### Pause on hover

_Type: Boolean_

If autoplay is turned on, this will pause autoplay when the navigation buttons are hovered.

    $('#lw_gallery_thumbnails').fsgallery({
      pauseOnHover: true
    });


###### Trigger element

_Type: Selector_

A jQuery selector for an element that opens the gallery when clicked. By default, the gallery opens when the original image list is clicked.

    $('#lw_gallery_thumbnails').fsgallery({
      trigger: $('.page-title')
    });


###### Hide after initialization

_Type: Boolean_

Hide the original image list after the fullscreen gallery is initialized.

    $('#lw_gallery_thumbnails').fsgallery({
      hide: false
    });


###### Destroy on close

_Type: Boolean_

Remove the fullscreen gallery container from the page when the gallery is closed.

    $('#lw_gallery_thumbnails').fsgallery({
      destroyOnClose: false
    });



#### Events:

###### Create

Triggered when the fullscreen gallery container is created.

    $('#lw_gallery_thumbnails').fsgallery({
      create: function(event) {
        console.log ('created')
      }
    });


###### Open

Triggered when the gallery is opened.

    $('#lw_gallery_thumbnails').fsgallery({
      open: function(event) {
        console.log ('opened')
      },
    });


###### Close

Triggered when the gallery is closed.

    $('#lw_gallery_thumbnails').fsgallery({
      close: function(event) {
        console.log ('closed')
      },
    });


###### Previous Image

Triggered when the gallery image changes to the previous image.

    $('#lw_gallery_thumbnails').fsgallery({
      prevImage: function() {
        console.log ('previous image')
      },
    });


###### Next Image

Triggered when the gallery image changes to the next image.

    $('#lw_gallery_thumbnails').fsgallery({
      nextImage: function() {
        console.log ('next image')
      },
    });


###### Change Image

Triggered when the gallery image changes either direction.

    $('#lw_gallery_thumbnails').fsgallery({
      changeImage: function() {
        console.log ('changed image')
      },
    });

***
