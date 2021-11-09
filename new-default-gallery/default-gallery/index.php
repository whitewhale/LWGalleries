<?php require $_SERVER['DOCUMENT_ROOT'].'/livewhale/frontend.php';?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="format-detection" content="telephone=no" />
    <link rel="shortcut icon" type="image/x-icon" href="#0" />
    <title>LiveWhale Carousel</title>
    <meta name="description" content="" />
    <meta name="keywords" content="" />
    <meta name="pagename" content="LiveWhale Default Gallery"/>

    <!-- LiveWhale gallery theme -->
    <xphp var="theme-disabled">default-gallery</xphp>

  </head>
  <body class="">

    <main class="main" style="padding: 200px 30px;">

      <div class="container" style="display:flex; justify-content: space-between; flex-wrap: wrap; ">
        <div style="flex: 0 1 auto; max-width: 100%; padding: 0 40px 100px 0;">
          <h1>Desktop size</h1>
          <widget type="galleries_inline">
            <arg id="id">1</arg>
          </widget> 
        </div>
        <div style="flex: 0 1 320px;">
          <h1>Sidebar/mobile size</h1>
          <widget type="galleries_inline">
            <arg id="id">2</arg>
          </widget>    
        </div>
      </div>



    </main>

  </body>
</html>