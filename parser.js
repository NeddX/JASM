const lx = require("./lexer");

const FundamentalTypes =
{
    None : 'None',
    String : 'String',
    Integer : 'Integer'
}

const StatementKind =
{
    VariableDeclaration : 'VariableDeclaration',
    AssignmentExpression : 'AssignmentExpression',
    IdentifierExpression : 'IdentifierExpression',
    FunctionCall : 'FunctionCall',
    Literal : 'Literal',
    OperatorCall : 'OperatorCall'
}

class Type
{
    constructor(name = '', fundamental_type = FundamentalTypes.None)
    {
        this.name = name;
        this.ftype = fundamental_type;
        this.field = [];
    }
}

class OpEntry
{
    constructor(name = "", priority = 0)
    {
        this.name = name;
        this.priority = priority;
    }
}

class Statement
{
    constructor()
    {
        this.name = "";
        this.type = new Type("void", FundamentalTypes.None);
        this.is_var = false;
        this.params = [];
        this.kind = StatementKind.FunctionCall;
    }
}

class Parser
{
    constructor(source)
    {
        this.lexer = new lx.Lexer(source);
        this.tree = [];
        this.op_entry = new Map([
            ['+', new OpEntry('+', 10)],
            ['-', new OpEntry('-', 10)],
            ['*', new OpEntry('*', 20)],
            ['/', new OpEntry('/', 20)],
            ['=', new OpEntry('=', 1)]
        ]);
        this.keywords = [ 'if', 'else' ];
        this.current_token = this.lexer.next_token();
        this.symbol_table = new Map();

        this.types = new Map([
            ['int', new Type('int', FundamentalTypes.Integer)],
            ['str', new Type('str', FundamentalTypes.String)]
        ]);
    }

    consume_token()
    {
        let token = this.current_token;
        this.current_token = this.lexer.next_token();
        return token;
    }

    // to print tokens in readeble format
    print_tokens()
    {
        console.log(JSON.stringify(this.tokens, null, 2));
    }

    parse() // expect_statement
    {
        let result = this.expect_variable_decl();
        if (result != null)
            this.tree.push(result);

        result = this.expect_keyword();
        if (result != null)
            this.tree.push(result);

        result = this.expect_expression();
        if (result != null)
        {
            this.expect_operator(';');
            this.tree.push();
        }

        return this.tree;
    }

    expect_variable_decl()
    {
        let start_token = this.current_token;
        let possible_type = this.expect_type();
        if (possible_type == null)
        {
            this.current_token = start_token;
            return null;
        }

        let possible_identifier = this.expect_identifier();
        if (possible_identifier == null)
        {
            throw new Error("Expected an identifier");
        }

        let stmt = new Statement();
        stmt.kind = StatementKind.VariableDeclaration;
        stmt.name = possible_identifier.text_span.text;
        stmt.type = possible_type;

        if (this.expect_operator('=') != null)
        {
            let value = this.expect_value();
            if (value == null)
                throw new Error("Unknown type");

            if (!this.expect_operator(';'))
                throw new Error("Expected ;");

            stmt.params.push(value);
        }
        else if (this.expect_operator(';') != null)
        {
            console.log("undefined variable declared");
        }
        else
        {
            throw new Error("Expected ;");
        }

        this.symbol_table[stmt.name] = stmt;

        return stmt;
    }

    expect_value()
    {
        let start_token = this.current_token;
        if (this.current_token != null)
        {
            switch (this.current_token.kind)
            {
                case lx.TokenKind.NumberLiteral: {
                    let stmt = new Statement();
                    stmt.kind = StatementKind.Literal;
                    stmt.name = this.current_token.text_span.text;
                    stmt.type = new Type('int', FundamentalTypes.Integer);
                    this.consume_token();
                    return stmt;
                }
                case lx.TokenKind.StringLiteral: {
                    let stmt = new Statement();
                    stmt.kind = StatementKind.Literal;
                    stmt.name = this.current_token.text_span.text;
                    stmt.type = new Type('str', FundamentalTypes.String);
                    this.consume_token();
                    return stmt;
                }
            }


        }

        let var_name = this.expect_identifier();
        if (var_name != null)
        {
            if (this.expect_operator('('))
                this.current_token = start_token;
            else
            {
                if (!this.symbol_table.has(var_name.text_span.text))
                {
                    throw new Error("Name does not exist!");
                }

                let found_var = this.symbol_table.get(var_name.text_span.text);
                let stmt = new Statement();
                stmt.kind = StatementKind.IdentifierExpression;
                stmt.type = found_var.type;
                stmt.name = var_name.text_span.text;
                return stmt;
            }   
        }

        if (this.expect_operator('('))
        {
            // ???
            return this.expect_expression();
        }

        return null;
    }

    expect_expression()
    {
        let lhv = this.expect_value();

        if (lhv == null)
        {
            // Don't need this
            lhv = this.expect_func_call();
            if (lhv == null)
                return null;
        }

        let op_type = this.get_op_type();
        if (op_type == null)
            return lhv;

        while (true)
        {
            let op = this.expect_operator();
            if (op == null)
                break;
            else if (op.kind == lx.TokenKind.Equals)
            {
                // Assignment expression
                if (!this.symbol_table.has(lhv.text_span.text));
                {
                    throw new Error("Symbol name does not exist!");
                }

                let found_var = this.symbol_table.get(lhv.text_span.text);

                let stmt = new Statement();
                stmt.kind = StatementKind.AssignmentExpression;
                stmt.type = found_var.type;
                stmt.name = lhv.text_span.text;
                stmt.params.push(this.expect_expression());
                return stmt;
            }

            let rhv_priority = this.get_op_priority(op);
            if (rhv_priority == 0)
            {
                return lhv;
            }
        }
    }

    expect_type()
    {
        let possible_type = this.expect_identifier();
        if (possible_type == null)
            return null;

        if (this.types.has(possible_type.text_span.text))
            return this.types.get(possible_type.text_span.text);

        return null;
    }

    expect_operator(name = '')
    {
        if (this.current_token == null)
            return null;

        if (!this.current_token.is_operator())
            return null;

        if (name != '' && this.current_token.text_span.text != name)
            return null;

        return this.consume_token();
    }

    expect_identifier(name = '')
    {
        if (this.current_token == null)
            return null;
        if (this.current_token.kind != lx.TokenKind.Identifier)
            return null;
        if (name != '' && this.current_token.text_span.text != name)
            return null;

        return this.consume_token();
    }

    expect_keyword()
    {
        
    }
}

module.exports = { Parser }
