---
title: Latest Articles
---
{% for post in site.posts %}
<section>
  <h1><a href="{{ post.url }}">{{ post.title }}</a></h1>
  <div>
    {{ post.excerpt | markdownify }}
    <p><a href="{{ post.url }}">Read more…</a></p>
  </div>
  <footer style="padding-right: 3em; text-align: right;">
    — {{ post.author }},
    <time>{{ post.date | date_to_long_string }}</time>
  </footer>
</section>
{% else %}
<p class="empty notice">
  No articles here.
</p>
{% endfor %}
