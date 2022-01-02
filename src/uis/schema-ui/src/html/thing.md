Thing - https://schema.org/Thing

A thing does not have to have a wrapper element, since it's in most cases a part of something e.g. article.
Title, can be the main article of a page h1, can be a list or something else e.g. em, b, h2, h3 etc. Different thing templates could cover all.

Fields not needed in html:
- identifier
- additionalType

You could therefore have a <footer> for a <section> or an <article>.
http://html5doctor.com/the-footer-element-update/

Multi h1 for SEO is possible for section and article:
https://www.greenlanemarketing.com/blog/seo-101-seo-and-multiple-h1-tags/

https://stackoverflow.com/questions/31235705/can-i-use-alternatename-more-than-once
Examples: Person with several name, Product with several color, Offer with several priceSpecification, item with several additionalType.




/* dit is natuurlijk microdata, dat is nu niet de bedoeling, alleen html
 <article itemprop="blogPost" itemscope itemtype="https://schema.org/BlogPosting">
 <meta itemprop="mainEntityOfPage" content="url-of-this-article.html">
 
 <h1 itemprop="name headline">Blog article title</h1>
 
 <p>
 <time datetime="2015-03-26T10:43:39Z" itemprop="datePublished">26 Mar 2015</time>
 <meta itemprop="dateModified" content="2017-04-11T12:52:01Z">
 </p>
 
 <figure itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
 <img itemprop="url contentUrl" alt="Alt text" src="https://hive-framework.philwareham.co.uk/mockups/img/640x320.png">
 <meta itemprop="width" content="640">
 <meta itemprop="height" content="320">
 <figcaption itemprop="caption">An example image caption.</figcaption>
 </figure>
 
 <div itemprop="description">
 <p><strong>Ex graeci civibus eleifend vim, mel et utroque fastidii.</strong></p>
 </div>
 
 <div itemprop="articleBody">
 <p>Lorem ipsum dolor sit amet, quo epicuri volutpat no. Causae option accusamus in est.</p>
 <p itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
 <img itemprop="url contentUrl" alt="Alt text" src="https://hive-framework.philwareham.co.uk/mockups/img/640x320.png">
 <meta itemprop="width" content="640">
 <meta itemprop="height" content="320">
 </p>
 <h3>Ne sea soluta voluptatum</h3>
 <p>Timeam mentitum an nam. Mei ne prima perfecto adversarium.</p>
 <p itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
 <img itemprop="url contentUrl" alt="Alt text" src="https://hive-framework.philwareham.co.uk/mockups/img/640x320.png">
 <meta itemprop="width" content="640">
 <meta itemprop="height" content="320">
 </p>
 <p>Inermis indoctum vis in, has soleat complectitur te.</p>
 <div itemprop="video" itemscope itemtype="https://schema.org/VideoObject">
 <video controls poster="https://hive-framework.philwareham.co.uk/video/big_buck_bunny.jpg">
 <source itemprop="contentUrl" type="video/mp4" src="https://hive-framework.philwareham.co.uk/video/big_buck_bunny.mp4">
 <source itemprop="contentUrl" type="video/webm" src="https://hive-framework.philwareham.co.uk/video/big_buck_bunny.webm">
 I’m sorry, your browser doesn’t support HTML5 video in MP4 with H.264 or WebM with VP8/VP9.
 </video>
 <p><small>Video copyright 2008, Blender Foundation / www.bigbuckbunny.org.</small></p>
 <meta itemprop="name" content="Video example">
 <meta itemprop="description" content="An example HTML5 video file.">
 <meta itemprop="duration" content="T60S">
 <meta itemprop="uploadDate" content="2018-09-21T10:44:26Z">
 <meta itemprop="thumbnailUrl" content="https://hive-framework.philwareham.co.uk/video/big_buck_bunny.jpg">
 </div>
 <div itemprop="audio" itemscope itemtype="https://schema.org/AudioObject">
 <audio controls>
 <source itemprop="contentUrl" type="audio/mp3" src="https://hive-framework.philwareham.co.uk/audio/moonlight_reprise.mp3">
 <source itemprop="contentUrl" type="audio/ogg; codecs=vorbis" src="https://hive-framework.philwareham.co.uk/audio/moonlight_reprise.ogg">
 I’m sorry, your browser doesn’t support HTML5 audio.
 </audio>
 <meta itemprop="name" content="Audio example">
 <meta itemprop="description" content="An example HTML5 audio file.">
 <meta itemprop="duration" content="T181S">
 <meta itemprop="uploadDate" content="2018-09-21T10:48:03Z">
 <p><small>“Moonlight Reprise” from “Irsen’s Tale” by Kai Engel. License: <a rel="external" href="https://creativecommons.org/licenses/by-nc/3.0/">Attribution-NonCommercial 3.0 International License</a>.</small></p>
 </div>
 </div>
 
 <footer>
 By:
 <span itemprop="author" itemscope itemtype="https://schema.org/Person">
 <a rel="author" itemprop="url" href="#" title="View author biography">
 <span itemprop="name">Aaron A. Aardvark</span>
 </a>
 <meta itemprop="jobTitle" content="Director">
 <meta itemprop="worksFor" content="ExampleCorp Ltd">
 </span>
 <span itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
 <meta itemprop="name" content="ExampleCorp Ltd">
 <span itemprop="logo" itemscope itemtype="https://schema.org/ImageObject">
 <meta itemprop="url" content="https://example.com/img/examplecorp-logo.png">
 <meta itemprop="width" content="320">
 <meta itemprop="height" content="60">
 </span>
 </span>
 <span role="separator">|</span>
 Tags:
 <span itemprop="keywords">
 <a rel="category tag" href="#" title="View articles in this category">Curla Wurla</a>
 <a rel="category tag" href="#" title="View articles in this category">Huly Hoops</a>
 </span>
 <span role="separator">|</span>
 Comments:
 <a href="#" title="View article comments" itemprop="discussionUrl">
 <span itemprop="interactionStatistic" itemscope itemtype="https://schema.org/InteractionCounter">
 <meta itemprop="interactionType" content="https://schema.org/CommentAction">
 <span itemprop="userInteractionCount">3</span>
 </span>
 </a>
 </footer>
 
 <aside itemscope itemtype="https://schema.org/WPAdBlock">
 <h6>Advertisements</h6>
 <a rel="external" href="ad-target-1.html" itemprop="url">
 <img itemprop="image" alt="Ad Example 1" src="https://hive-framework.philwareham.co.uk/mockups/img/300x250.png" width="300" height="250">
 </a>
 <a rel="external" href="ad-target-2.html" itemprop="url">
 <img itemprop="image" alt="Ad Example 2" src="https://hive-framework.philwareham.co.uk/mockups/img/300x250.png" width="300" height="250">
 </a>
 </aside>
 
 <section>
 <h3>Comments</h3>
 <ol>
 <li>
 <article itemscope itemtype="https://schema.org/Comment">
 <h4 itemprop="author" itemscope itemtype="https://schema.org/Person">
 <span itemprop="name">Joe Q. Public</span>
 </h4>
 <p>
 <time datetime="2015-01-26T16:55:03Z" itemprop="dateCreated">26/03/15 16:55</time>
 </p>
 <div itemprop="text">
 <p>Inermis indoctum vis in, has soleat complectitur te.</p>
 </div>
 </article>
 </li>
 </ol>
 </section>
 
 </article>
 */