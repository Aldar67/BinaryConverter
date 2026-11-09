using Microsoft.AspNetCore.Http.HttpResults;
using NumberSystems.Core;
using NumberSystems.Core.Exercises;

namespace NumberSystems.Web.Api;

public static class ConversionEndpoints
{
    public static IEndpointRouteBuilder MapConversionApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");

        // GET /api/to-decimal?number=1A3&radix=16
        api.MapGet("/to-decimal", (string? number, int radix) =>
            ToHttp(PositionalExpansion.ToDecimal(number, radix)));

        // GET /api/from-decimal?number=419&radix=16
        api.MapGet("/from-decimal", (string? number, int radix) =>
            ToHttp(DivisionChain.FromDecimal(number, radix)));

        // POST /api/check  { kind, number, radix, index, answer }
        api.MapPost("/check", (CheckRequest request) =>
            ToHttp(AnswerChecker.Check(request)));

        // GET /api/exercise?direction=FromDecimal
        api.MapGet("/exercise", (ConversionDirection direction, ExerciseGenerator generator) =>
            TypedResults.Ok(generator.Next(direction)));

        return app;
    }

    private static Results<Ok<T>, BadRequest<ConversionError>> ToHttp<T>(Result<T> result) =>
        result.IsSuccess
            ? TypedResults.Ok(result.Value!)
            : TypedResults.BadRequest(result.Error!);
}
