namespace NumberSystems.Core.Exercises;

public enum ExerciseKind
{
    /// <summary>Найти вклад выбранного разряда. Number — в системе Radix, Index — номер разряда.</summary>
    DigitContribution,

    /// <summary>Найти очередной остаток. Number — десятичное, Index — номер деления.</summary>
    NextRemainder,

    /// <summary>Записать цифры в правильном порядке. Number — десятичное, Index не используется.</summary>
    DigitOrder,
}

public sealed record CheckRequest(ExerciseKind Kind, string Number, int Radix, int Index, string? Answer);

/// <param name="Hint">Наводящая подсказка без готового ответа.</param>
/// <param name="Explanation">Полное решение — показывается после верного ответа или по запросу.</param>
public sealed record CheckResult(bool Correct, string Expected, string Hint, string Explanation);

/// <summary>
/// Проверка без состояния: условие задачи целиком приходит в запросе,
/// правильный ответ каждый раз вычисляется заново доменными алгоритмами.
/// </summary>
public static class AnswerChecker
{
    public static Result<CheckResult> Check(CheckRequest request) => request.Kind switch
    {
        ExerciseKind.DigitContribution => CheckContribution(request),
        ExerciseKind.NextRemainder => CheckRemainder(request),
        ExerciseKind.DigitOrder => CheckOrder(request),
        _ => Result<CheckResult>.Fail(ErrorCode.InvalidAnswer, "Неизвестный тип задания."),
    };

    private static Result<CheckResult> CheckContribution(CheckRequest request)
    {
        var expansion = PositionalExpansion.ToDecimal(request.Number, request.Radix);
        if (!expansion.IsSuccess) return Result<CheckResult>.Fail(expansion.Error!);

        var term = expansion.Value!.Terms.FirstOrDefault(t => t.Position == request.Index);
        if (term is null)
            return Result<CheckResult>.Fail(ErrorCode.IndexOutOfRange,
                $"В числе нет разряда с номером {request.Index}.");

        var correct = int.TryParse(Normalize(request.Answer), out var answer) && answer == term.Contribution;
        var explanation =
            $"{term.Symbol} · {request.Radix}{Superscript(term.Position)} = " +
            $"{term.DigitValue} · {term.Weight} = {term.Contribution}";

        return Result<CheckResult>.Ok(new CheckResult(correct, term.Contribution.ToString(),
            "Вклад = значение цифры × основание в степени номера разряда (разряды нумеруются справа, с нуля).",
            explanation));
    }

    private static Result<CheckResult> CheckRemainder(CheckRequest request)
    {
        var chain = DivisionChain.FromDecimal(request.Number, request.Radix);
        if (!chain.IsSuccess) return Result<CheckResult>.Fail(chain.Error!);

        var steps = chain.Value!.Steps;
        if (request.Index < 0 || request.Index >= steps.Count)
            return Result<CheckResult>.Fail(ErrorCode.IndexOutOfRange,
                $"Деления с номером {request.Index} нет: всего делений {steps.Count}.");

        var step = steps[request.Index];
        var answer = Normalize(request.Answer);

        // Остаток 11 при основании 16 засчитываем и как «B», и как «11».
        var correct = answer == step.RemainderSymbol.ToString()
                      || (int.TryParse(answer, out var value) && value == step.Remainder);

        var explanation = $"{step.Dividend} = {step.Divisor} · {step.Quotient} + {step.Remainder}" +
                          (step.Remainder >= 10 ? $", остаток {step.Remainder} записывается цифрой {step.RemainderSymbol}" : "");

        return Result<CheckResult>.Ok(new CheckResult(correct, step.RemainderSymbol.ToString(),
            $"Сколько раз {step.Divisor} целиком помещается в {step.Dividend}? Вычтите это произведение — получится остаток.",
            explanation));
    }

    private static Result<CheckResult> CheckOrder(CheckRequest request)
    {
        var chain = DivisionChain.FromDecimal(request.Number, request.Radix);
        if (!chain.IsSuccess) return Result<CheckResult>.Fail(chain.Error!);

        var result = chain.Value!;
        var correct = Normalize(request.Answer) == result.Digits;
        var collected = string.Join(", ", result.Steps.Select(s => s.RemainderSymbol));

        return Result<CheckResult>.Ok(new CheckResult(correct, result.Digits,
            "Первый полученный остаток — младшая (самая правая) цифра числа.",
            $"Остатки по порядку получения: {collected}. Читаем их от последнего к первому: " +
            $"{result.Value}₁₀ = {result.Digits}{Subscript(result.Radix)}"));
    }

    private static string Normalize(string? answer) =>
        (answer ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", string.Empty);

    private static string Superscript(int n) => Map(n, "⁰¹²³⁴⁵⁶⁷⁸⁹");
    private static string Subscript(int n) => Map(n, "₀₁₂₃₄₅₆₇₈₉");
    private static string Map(int n, string table) => new(n.ToString().Select(c => table[c - '0']).ToArray());
}
