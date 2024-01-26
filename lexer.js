// TokenKind defines enumeration for different token types
const TokenKind = {
    None : 'None',                           // for undeclared token tipe
    NumberLiteral : 'NumberLiteral',         // for numeric literals ( 44, 55 ...)
    StringLiteral : 'StringLiteral',         // for string literals  ("some text" ...)
    Identifier : 'Identifier',               // for identifiers
    Colon : 'Colon',                         // for colon                 :
    LeftBracket : 'LeftBracket',             // for left bracket          {
    RightBracket : 'RightBracket',           // for right bracket         }
    LeftBrace : 'LeftBrace',                 // for left brace            (
    RightBrace : 'RightBrace',               // for rightt brace          )
    Asterisk : 'Asterisk',                   // for asteric               *
    Plus : 'Plus',                           // for plus                  +
    Minus : 'Minus',                         // for minus                 -
    ForwardSlash : 'ForwardSlash',           // for forward slash         /
    SemiColon : 'SemiColon',                 // for semicoin              ;
    Equals : 'Equals',                       // for ecual sign            =
    LeftAngleBracket : 'LeftAngleBracket',   // for left angel bracket    <
    RightAngleBracket : 'RightAngleBracket', // for right angel bracjet   >
    DoubleQuote : 'DoubleQuote',             // for double quotes         "
    EOF : 'EOF'                              // for end of sourse file
}

// Utils contains utility functions used by the lexer
const Utils = {
    /* 
     is_digit checks if a character is a digit
     * Parameters:
     *  - char: The character to be checked
     * Returns:
     *  - true if the character is a digit, false otherwise 
     */
    is_digit : function(char) { return !isNaN(parseInt(char)); },

    /* 
     is_alnum checks if a character is alphanumeric (a letter or a digit)
     * Parameters:
     *   - char: The character to be checked
     * Returns:
     *   - true if the character is alphanumeric, false otherwise 
     */
    is_alnum : function(char) {
        let alphanumeric_regex = /^[a-zA-Z0-9]$/; // Regular expression to match alphanumeric characters
        return alphanumeric_regex.test(char);
    }

}

// TextSpan represents a span of text within the source code
class TextSpan
{
    /* 
     Constructor for TextSpan class
     * Parameters:
     *   - start: The starting index of the text span (default is 0)
     *   - end: The ending index of the text span (default is 0)
     *   - source: The source code string (default is an empty string) 
     */
    constructor(start = 0, end = 0, source = "")
    {
        this.start = start; // The starting index of the text span
        this.end = end;     // The ending index of the text span

        // The actual text within the span
        if (end == 0)
        {
            this.text = ""; 
        }
        else
        {
            this.text = source.substring(start, end);
        }
    }
}
/* 
Usage example:
 * const span = new TextSpan(5, 10, "Hello, World!");
 * console.log(span.start); // Output: 5
 * console.log(span.end);   // Output: 10
 * console.log(span.text);  // Output: "World"
 */

    
// Lexer is responsible for tokenizing the source code
class Lexer
{
    /*
    Constructor for Lexer class
     * Parameters:
     *   - source: The source code string to be tokenized
     *   -current_pos:  The current position in the source code
    */
    constructor(source)
    {
        this.source = source;
        this.current_pos = 0;
    }

    // Retrieves the next token from the source code
    next_token()
    {
        let token = null;

        // Skip whitespace and newline characters
        while (this.source[this.current_pos] == ' ' || this.source[this.current_pos] == '\n')
        {
            this.current_pos++;
        }

        if (this.current_pos > this.source.length)
        {
            return null;
        }

        if (this.current_pos == this.source.length)
        {
            this.current_pos++;
            return new Token(TokenKind.EOF, new TextSpan());
        }

        let number = 0;
        let c = this.current_char();
        let start = this.current_pos;
        let kind = TokenKind.None;

        if (this.is_number_start(c)) // Check for numeric literals
        {
            kind = TokenKind.NumberLiteral;
            number = this.lex_number();
        }
        else if (this.lex_operator(c) != TokenKind.None) // Check for operators
        {
            kind = this.lex_operator(c);

            this.consume();

            if (kind == TokenKind.DoubleQuote) // Handle special case for DoubleQuote(string)
            {
                kind = this.lex_string();
            }
        }
        else
        {
            // Possible Identifier
            kind = this.lex_identifier();
        }

        let end = this.current_pos;
        let span = new TextSpan(start, end, this.source)

        return new Token(kind, span, number);
    }

    // Retrieves the current character in the source code
    current_char() { return this.source[this.current_pos]; }

    // Checks if a character is the start of a number
    is_number_start(char) { return !isNaN(parseInt(char)) && isFinite(char); }

    // Lexes operators and returns their corresponding TokenKind
    lex_operator(char)
    {
        switch (char)
        {
            case '+': return TokenKind.Plus;
            case '-': return TokenKind.Minus;
            case '*': return TokenKind.Asterisk;
            case '/': return TokenKind.ForwardSlash;
            case ':': return TokenKind.Colon;
            case ';': return TokenKind.SemiColon;
            case '=': return TokenKind.Equals;
            case '{': return TokenKind.LeftBracket;
            case '}': return TokenKind.RightBracket;
            case '(': return TokenKind.LeftBrace;
            case ')': return TokenKind.RightBrace;
            case '<': return TokenKind.LeftAngleBracket;
            case '>': return TokenKind.RightAngleBracket;
            case '"': return TokenKind.DoubleQuote;
            default: return TokenKind.None;
        }
    }

    // Lexes identifiers
    lex_identifier()
    {
        let c = this.consume();
        let start = this.current_pos;

        // Continue consuming characters if they are alphanumeric
        while (c != null)
        {
            if (Utils.is_alnum(c))
            {
                c = this.consume();
            }
            else
            {
                if (start != this.current_pos) // If the identifier has started, return Identifier token
                {
                    this.current_pos--;
                    return TokenKind.Identifier;
                }
                else
                {
                    return TokenKind.None; // If no valid identifier found, return None
                }
                break;
            }
        }
    }

    // Lexes string literals
    lex_string()
    {
        let c = this.consume();

        while (c != null)
        {
            if (c == '"') // Return StringLiteral token if closing double quote is found
            {
                return TokenKind.StringLiteral;
            }
            c = this.consume();
        }

        return TokenKind.None;
    }

    // Consumes the current character and advances the position
    consume()
    {
        if (this.current_pos >= this.source.length)
        {
            return null;
        }

        let c = this.current_char();
        this.current_pos++;
        return c;
    }

    // Lexes numeric literals
    lex_number()
    {
        let num = 0;
        let c = this.consume();
        while (c != null)
        {
            if (Utils.is_digit(c)) // Continue consuming characters if they are digits
            {
                num = num * 10 + +c;
                c = this.consume();
            }
            else
            {
                this.current_pos--; // If a non-digit is encountered, go back one position
                break;
            }
        }

        return num;
    }
}
 /*
 Usage example:
  * const lexer = new Lexer("let num: string = \"asd\";");
  * const token = lexer.next_token();
  * console.log(token); 
  * Output: Token { token_kind: 'Identifier', text_span: TextSpan { start: 0, end: 3, text: 'let'}, number: 0 }
 */


// Token represents a lexical token with its kind, text span, and opti
class Token
{
    /* 
    Constructor for Token class
    * Parameters:
    *    - token_kind: The type or kind of the token (e.g., Identifier, NumberLiteral)
    *    - text_span: An instance of the TextSpan class representing the position and text of the token in the source code
    *    - number: An optional numeric value associated with the token (default is 0)
    */
    constructor(token_kind, text_span, number = 0)
    {
        this.kind = token_kind;
        this.text_span = text_span;
        this.number = number;
    }

    is_operator()
    {
        switch (this.text_span.text)
        {
            case '+':
            case '-':
            case '*':
            case '/':
            case ':':
            case ';':
            case '=':
            case '{':
            case '}':
            case '(':
            case ')':
            case '<':
            case '>':
            case '"':
                return true;
            default:
                return false;
        }
    }
}

// Export the classes and enumeration for external use
module.exports = {
    Token,
    Lexer,
    TokenKind
}
