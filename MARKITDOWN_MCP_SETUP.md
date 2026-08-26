# MarkItDown MCP Server Setup

## Overview
Le serveur MCP MarkItDown a été configuré avec succès. Il permet de convertir des fichiers (PDF, Word, Excel, PowerPoint, CSV, images, etc.) en Markdown directement via le protocole MCP.

## Installation

### 1. Dépendances Python installées ✅
```bash
pip install markitdown[all]  # Bibliothèque MarkItDown
pip install mcp              # Framework MCP Python
```

### 2. Fichiers de configuration

#### `.mcp.json` (Racine du projet)
Le serveur MarkItDown est enregistré avec la configuration suivante :
```json
{
  "mcpServers": {
    "markitdown": {
      "type": "stdio",
      "command": "python",
      "args": ["mcp_server_markitdown.py"]
    }
  }
}
```

#### `mcp_server_markitdown.py` (Serveur personnalisé)
Implémente le protocole MCP avec un outil `convert_to_markdown` qui :
- Accepte un chemin de fichier (file_path)
- Convertit le fichier en Markdown
- Retourne le contenu Markdown converti

## Usage

### Comment convertir un fichier

Pour convertir un document en Markdown, utilisez l'outil `convert_to_markdown` avec le chemin du fichier :

```
convert_to_markdown(file_path="/path/to/document.pdf")
```

### Formats supportés

Le serveur supporte les formats suivants (via MarkItDown) :
- 📄 **Documents** : PDF, DOCX, PPTX, ODT
- 📊 **Feuilles de calcul** : XLSX, XLS, CSV
- 🖼️ **Images** : JPG, PNG, GIF, BMP (OCR intégré)
- 📝 **Web** : HTML
- Et autres formats supportés par MarkItDown

## Exemple d'utilisation

```python
# Convertir un PDF en Markdown
result = convert_to_markdown(file_path="C:/Users/xavier/Documents/rapport.pdf")

# Convertir un fichier Word
result = convert_to_markdown(file_path="C:/path/to/document.docx")

# Convertir une image avec OCR
result = convert_to_markdown(file_path="C:/path/to/screenshot.png")
```

## Avantages

✅ Conversion automatique de documents en Markdown  
✅ Support multi-format  
✅ OCR intégré pour les images  
✅ Intégration directe avec Claude Code  
✅ Pas de dépendances externes (tout en local)

## Reconnecter le serveur

Si vous modifiez le serveur, reconnectez via :
- Relancez Claude Code
- Ou utilisez `/mcp` pour reconnecter manuellement

## Troubleshooting

**Erreur : "File not found"**
- Vérifiez que le chemin du fichier existe
- Utilisez des chemins absolus de préférence

**Erreur : "Unknown tool"**
- Assurez-vous que le serveur est bien enregistré dans `.mcp.json`
- Reconnectez le serveur MCP

**MarkItDown ne reconnaît pas le format**
- Vérifiez que toutes les dépendances MarkItDown sont installées :
  ```bash
  pip install markitdown[all]
  ```

## Documentation additionnelle

- [MarkItDown GitHub](https://github.com/microsoft/markitdown)
- [MCP Protocol](https://modelcontextprotocol.io/)
