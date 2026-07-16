(function () {
  "use strict";

  var grid = document.getElementById("grid");

  function titleFromFile(file) {
    return file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").toLowerCase();
  }

  // O ID do GitHub é imutável; o username pode mudar com rename da conta.
  function avatarUrl(souza, size) {
    return souza.authorId
      ? "https://avatars.githubusercontent.com/u/" + souza.authorId + "?s=" + size
      : "https://github.com/" + souza.author + ".png?size=" + size;
  }

  // Imagens vêm direto do repo no GitHub, não do build da Vercel: assim uma
  // imagem nova aparece sem precisar de um novo deploy.
  function imageUrl(file) {
    return "https://raw.githubusercontent.com/matheusaudibert/souzadex/main/assets/images/" + encodeURIComponent(file);
  }

  function downloadImage(url, filename) {
    fetch(url)
      .then(function (res) { return res.blob(); })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      });
  }

  // Link cross-origin: o atributo download sozinho não força o save-as,
  // então baixamos via blob.
  var downloadOriginal = document.querySelector(".download-original");
  if (downloadOriginal) {
    downloadOriginal.addEventListener("click", function (event) {
      event.preventDefault();
      downloadImage(imageUrl("original.jpeg"), "original.jpeg");
    });
  }

  function render(souzas) {
    // SOUZAS está em ordem cronológica; exibe os mais recentes primeiro.
    souzas.forEach(function (souza, index) {
      var number = index + 1;
      var title = titleFromFile(souza.file);

      var card = document.createElement("article");
      card.className = "card";
      card.dataset.name = title;

      card.innerHTML =
        '<a class="card-image" href="souza.html?foto=' + encodeURIComponent(souza.file) + '">' +
        '  <img src="' + imageUrl(souza.file) + '" alt="' + title + '" loading="lazy">' +
        "</a>" +
        '<div class="card-info">' +
        '  <h2 class="card-title">' +
        '    <span class="card-number">#' + number + ":</span> " + title +
        "  </h2>" +
        '  <div class="card-authors">' +
        '    <a href="https://github.com/' + souza.author + '" target="_blank" rel="noopener" title="' + souza.author + '">' +
        '      <img src="' + avatarUrl(souza, 64) + '" alt="' + souza.author + '" width="28" height="28" loading="lazy">' +
        "    </a>" +
        "  </div>" +
        "</div>";

      grid.prepend(card);
    });
  }

  fetch("/api/souzas")
    .then(function (res) {
      if (!res.ok) throw new Error("status " + res.status);
      return res.json();
    })
    .then(render)
    .catch(function () {
      grid.innerHTML = '<p class="empty">Não foi possível carregar a galeria. Tente recarregar a página.</p>';
    });
})();
