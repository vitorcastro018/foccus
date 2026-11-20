namespace Foccus.Agent;

public static class SiteParser
{
    /// <summary>
    /// Extrai apenas o host do texto de uma barra de endereços (sem esquema, caminho, query nem "www.").
    /// Retorna null se o texto não for um endereço http(s) (busca em digitação, chrome://, about:, file:).
    /// </summary>
    public static string? ParseHost(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        value = value.Trim();
        if (value.Any(char.IsWhiteSpace)) return null;
        var candidate = value.Contains("://") ? value : "https://" + value;
        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) return null;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return null;
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.")) host = host[4..];
        if (host != "localhost" && !host.Contains('.')) return null;
        return host.Length is > 0 and <= 200 ? host : null;
    }
}
