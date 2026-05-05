import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/Table";
import Button from "../ui/Button";
import { FileText, Printer, Search, Users } from "lucide-react";
// Logo del colegio embebido en base64
const LOGO_B64 =
    "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAFAAPUDASIAAhEBAxEB/8QAHQABAAIDAQEBAQAAAAAAAAAAAAcIBAUGAwECCf/EAFgQAAECBQICBQYHCwoCBwkAAAECAwAEBQYRByESMQgTIkFRFDI3YXG0FSM4c3SBkRYXNkJSdYShsbKzJENWYnKCkpWi0jNjGCU0NVPBw1Vkg5S1wtHw8f/EABkBAAMBAQEAAAAAAAAAAAAAAAADBAIBBf/EADgRAAEDAgMDCgUEAgMBAAAAAAEAAgMEERIhMUFRcQUTFDI0YXKBocEiM5Gx0SNCgvFEUhXh8CT/2gAMAwEAAhEDEQA/ALlwhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhGlrd22tRCoVe4qTIqScFD82hCs+HCTnMdAJyC4SBmVuoRF1Z190xpxUlFben1p2KZWUcV/qUAk/bGsl+klpw66lC/hllJ5rXKAge3hUT+qHClmIuGH6JJqoQbFw+qmSEcPRdXdNqvw+S3fTWyrkJpRljnw+NCY7GRnZOfYD8jNy800eS2XAtP2iFvjczJwsmte1+bTde8IQjC0kIQgQkIQgQkIQgQkIQgQkIQgQkIQgQkIQgQkI8puZlpRgvzcw1LtJ5rdWEpH1mOOrmrOnFGz5Zd9MWoHBTLOGZVnww0FGNtjc/Jousue1mbjZdtCIQrfSZsaT40U2QrFSWPNUGktNn61K4v9McbOdJW66q8qXtay5YOk4SHFOTa/sQE7+rf64pZQVDv2245KZ1dA391+GatDHxakoQVrUEpAySTgARVk1LpMXYMS8nUKYwvuDDMlw578uYX+sx9R0f9TLiWl27byYIO/wAdNPTbifqVhP2GN9DY35kgHDNYFY9/UjJ45Ke63qRYVFB+EbtpDahnLbcyl1Y/uoyr9UcLXOkjp3IZEiarVlcgZeV4E/WXCk/qjT0PovWvLlKqxcFVn1AbhhCGEE+sELOPrju6HorplSSlTVrS004Oapxa38+1KyU/qgtRs1Jd6IvVv0Ab6qJqp0oalNO+T27ZrfWKOGzMzCnVK/uISPsCjGH92XSPus/9VUSbprS+XVU1LCCPUt/u9YMWbpVJpdJZ6il02TkGuXBLMJbT9iQIzIOlQt6kQ880dFld15D5ZKrH3ntbbo3uW6+oaV5zU1U3HcexCMo/WI3dE6LNORwqrV2zT4PnIlJVLWPYpRVn7IsZCOHlCfRptwC6KCHVwvxKimi9HzTKnBJepU3Ulp5Km5tf24Rwp/VG3ndGNMZtgtOWjJoB72luNq+1KgY7+ETmpmJuXn6p4p4gLBo+ihGt9GexZviXTp6sU1ZJwlLyXWx9Sk8X+qOOnujLcdOe8otm9JYujzS805LKH95BWYs/CHMr6hv7r8c0p1DA79tuGSquLe6StqYMjU56pMo2ymdam048Al7KsfVtH0a5auWzhF1Wg2ttHnOTMg7LLV/eHZ+xMWngdxgxvprXfMjB9Fjobm/LkI9VXuh9KSgvFKa1bFRk/FUq+h8D19rgx/8AvOO5oeuumVVCR90IkXVfzc4wtvHtVgp/XHUVyxLMreTVbXpE0s83FSqA5/jACv1xwtb6O2mtQKlSspUKUo5/7JNkjPsc4/1QYqN+oLeGaMNWzQh3HJSXRq/Q60jjo9Zp1RT4ysyh390mNlFaaz0W1IUXqDeBSpJy23NymCD49YhX/wBsa773nSFtQH4EuF+oNI3CJeqcaMDwQ/wj7B9sHRYHdSUeYsjpMzevGfLNWnhFWPvra72sMXFa65tpPnPTVKWhJ9i2sJ/bG4onSmklcCa3aUwzt2nJOaDmfYlSU4/xRw8nT6tseBXRyhDo644hWPhEVUPpA6ZVLhS9VZqmrVyTOSixv61I4kj7Y7mh3fatc4fgi46VPKVyQzNoUvPgU5yD6iImfBJH1mkKhk0cnVcCt5CEIUmpCEIEJFbteL3virarNaaWVPO09aQ2hamXeqcdcW2HMlzmlIQRsCO/OdgLIxV+pfLhT8+17gmLaENxucRewJHFR1pdha0G1yAvzKdGu7qu+Ji6b0lg4dypHWza/rKyjf6/tjsKH0ZbJlCldTqdYqSx5yesSy2r6kp4v9UTlCOOr6h37rcMl1tDA39t+Oa4eh6R6b0YJ8ktGnOqT+NNoMyc+PxhVHZScpKyTAl5OWZlmU8m2kBCR9Q2j2hEz5HPzcbqhsbWZNFkhCEYW0hCECEhEI601a5Lh1SoWllv1h6iS87LGan5xkkOFOFnhBGDjhbOwIyVDOwj0TZVS0nYql5Sl71uqUyRpzri6XOK40vvcOEcRzgJzjkkKGOeCRFQphhF3WJ0CmM5xGzchqVNUIrlYendz6j2i3e1c1ErktVKgVuyaJZ0pZlwFFIykEbZTnCeHGfGOWuK/runNEKnTqnVZpFboNfaknZ6XfKFuoKXdipJBUQUK37xw8zkxsUeI4WuvY2Pd+Us1lhdzbXFx3q20I526Xnm9NarMNvOIfTR3lpcSohQUGSQQeec75iptm3Ha79AZcurUi/5SqlSusak5hamgOI8OCcnJGO+MQUplaXX07rpk1SInAW177K6kIr3cCbivvVtWl0jc9QpVCt6ntqnH2nD5RNlKG8qURjJJWkb7bE4ziMTSeu2vI1GuU239SbgriZqmPqk5GcYcSGVpQpal8atuLCdiOHvznYxrohwYr562sdO8rPShjtbLS9xqrHwiq0jfF3N6M2Pb9Iq0yis3RU5iU+EXnipxtIfSgALO4JLid+YAPfuNxqFYl0aVW0L5ty/qzOTMi435czOOFTTyVrCc8OdxxKHZVnY5BBEa6HY4S4AkkDvtl5LnS7jEG3AAJ7r5+asjCNZalVFdtak1sNFkVCSZmurJ8zrEBWPqzGziIixsqwb5pCEI4upGnrlq2zXAfhi36XPk/jTEqhah7CRkRuIR0Eg3C4QDkVFtc0C0yqeVN0Z6nOKOSuTmVp/0qKkj7I4Wt9Fqmr4lUS7JuX70onJZLufUVJKf2RYyEUsrahmjz9/up30cD9Wj7fZVFuiw9XNKKM7cNPu5TlMk1I4/JZxzCQVBIKmVjhUMkZHa5+EWI0Xu5699O6bX5pttuccCmplKPN6xCikkeAIwrHdmNP0n1qRoZcRQopOJYZB7jMtAxq+iL6HJf6a/wDtEUTPM9NzjgLg2v5JETOZqebaTYi9vNS9CEI81egkVfqXy4U/Pte4Ji0EVfqXy4UfPte4Ji6h1k8JUVbozxBWghHKavXDP2ppxWLgpiWVTcm2hTQeTxIyXEpOQCM7E98RM1qTrLSbUk74q9uUGpW4802+6JVSkPJaXjCvOOOY7jjO/jCY6Z8jcQtrbXanSVDI3YTfS+mxWEhEF3tqrdc5c9p0zTtqmPN3DThNNCebOQvK8pJCgBgIIPPcRtNO9Q70++YrT+/6VTWJ92VMzLPyCiUkAZwoZPMBW+3Lkcx3okmHF522rPSo8WHyvsUwQhFbLP1M1tui1Z+6KPTrZfp9PccQ8HEKQoltCXFAArGeyod8ZigdKCQQLW171uWdsZAIOe7uVk4RHFu6pSlQ0Ve1DnZVMqqWYc66XCiUl5KuFKUk9ylcOPDix3Rqej1qfVr4XVKVc8tLylXlUtTTKGm1NhyXcSCFcJJO2UnOdwtMBppA1ziOrkVwVEZc1oPWzCztYtN6pclbpd32jVW6VdFKHA067nq3W8k8JwDg9pXcQQogjB2xLetLVOt1SY++LcdMVQ35J6Tepkg3kPpcTjiJKRwkbEKyTtgAZMaC19cZlOsVatG6jIStKan5mUk5tKSjq1NuKCQ4SogggYzgb48Y87F11m7k1Pqcm43Jy1qSsrMzTbqmldd1TKc8ajnvAKsY25d2Ys5qpawtIFgL3ts7ipedp3PxAnM2t394WKLP1Z04oUzSKLfVuS1rpcIYm6mrqlSocVjmUkJPErPMjPLGYyq1ohNjRhFtW/UZWoVacqLdRnJ6YcKUPdhQ7JAJwOIYznOSe/EaaqVPUjWemmq0i06Mq2ZGbLsjK1B5YVNrRt2gFhK+ZGDhO5GTjMbea1wqa9H5+tU+mSdOuGjzzMjOybrZU0jiJHElOQQDwKGCdikjfvYRPlhte4va2uy6WDBne9rZXvpttdbmSouuc3KvUmuz1rqpb8k/LOBniC+0ypKMHh/KKcnwzHO2dYmt9qUBmiUpyzjKsqWpPXpK15UoqOVFHrjcTWtj0/oXN3lRESbVdkXGGJyVdSVIbWtYBUBkHhUCSnfxHMGJetSeeqlr0mpTIQH5uSZfcCBhPEtAUcerJhD5JYgcTQBe1rbR/acyOKUjC43te99h/pRXd+ml6KuuQ1As6tSEhdC5NtmrNPZ8nmVBCUqIwk7HhA4SMdlJBBG+BZ+k15qu+bu+7KlRETnwe/KSspTWOBvtoUgcRCUgAcRPJROee2I/N+a3z1B1bTRZWVlnbZkZliUqs0ptRU265kqwsHA4RnYjcoVE7gggEEEHkRHHyzxRgEDMa7bblpkcMryWnQ+V96glnRCoTujlGtyeqMvIXHRpp6ZkpthaltoK1lXCTgHBwg5AyCkc+/zqunOsN7MytCvq6qO1QWXErmPIUkuzPDyyOBIP1kDJzg4xEiazX8xp5aJq5lhOTj7ol5OXKiAtwgnJI34QASfqG2Y4qlVjpCMzlNn6jbtvzUlOvIS9JIX1a5VCiN1K4iU4HM9vHh3RqOSZzcZI1Nr2122WHxwtdgAOgvbdsupjpsnLU6nS1Pk2g1LSrKGWUDklCQAkfUAIyIr5O6mam1DUG5aBbqrVal6POKZSagrqlKRxEJ3KxxHbfAj3vDUXVC3retpLyLaerNaqT0sgsAuMKQOrSjBC9jxKUDueXKFdCkJAuLnv7rpvS2AE2Nh3eSnyEQnQ9RNRKFqRRbT1DpFHDVaymWfp6lcSFbgZ7RBGcA7DGc5OMRyllap6v3bS3alTXLKZZafUwpM251K+IJSrISpzOO0N/b4RwUTzc3Ft9101jBYWN91tysvCIgN+3jIalWNadVbpJNYkC/USwgqHH8b/AMNXFjh7Ce498bbXK+KzZf3N/A6JRXwlUhLP9e2VYQcebgjB39cLFO8uDRtWzUMDS47FJMIha5dR73uHUCo2ZphTJBZpJKKhUZ45QhYOCkb4GFAp5KJIOAAMxm6ZakXM7fr+nmoVKlZKuhkvSkxKn4qZSE8R2yd8AkEbdkggEb9NK/Di87bbcFwVLC7D5X2XWw6UXoKuL9F96ajW9EX0OS/01/8AaI2XSi9BVxfovvTUazoiehyX+mv/ALRFA7CfF7JJ7b/H3UvwhCPPVyRV+pfLhR8+17gmLQRV+pfLgR8+17gmLqHWTwlRVujPEFMnSClJqe0duGUkpZ6amHGWwhplsrWo9ag7AbmIfauy9qzpPJabUHTquNzq5Bunvzk0wptlKAkJUcqSAMjbKiMZ8Ys5CFxVIjZhLb2NxxTJafG/EHWuLKsNxaYVVq/NOrWS/VWWJSkFmaqlNSpIYcKnlq4XMYT2jgZ3weW8ZWmFOqWnF+3eu4bdq9erDEot2m1QIdcE22lPF1YVhQC1JCd9yCkp9tlIQw1zi3C4ZH83SxRNDsTTmPxZaaya0/cVrSNamaXMUp2aQVKlJjPWNYURg5A8M8u+Km2vpfd0/ovWarJzFfkZ6XnlpXRl9Y03NsBtsqUG8AqXufHPBjnFy4QuGqdDfANSPRMmpmzWxnRVhueTqN32PY2m1oW3U6HKP5fqZmZV1LcstJVkLWR2sq6xe/PsciQI9pi0b+041It29ajPKuVl1wSE6afIqCm5fgCRxJQNwE7jbmgDwizEIYK1wGEDLO/ffvWDRgnETnl6dyrhQNMBes/qdTazKzNNW7cSpmmzrkuRj417Kk5xxpKTg4ONwe4R6Oadpa1rmbbplNm5ShOWq5Tm5sMKLaVLaKSorxgqySTvkkmLFwjhrpLndb2Av6IFFHYb7+5/Krhp9el46V22bGrmndZqT8k46Ke/IoKmn+Nal44gk5GSo8QycHBSCI56t2HeDOj11V6r0qZNcuassTi6ewyVrbSFuK4ilOSnJdVtzAAzjkLYQjorbHE1oBJBPfbPyXDR3Fi4kAEDuv8AdVX1z0rq0lQ5W5rSk5tTdSlJdqtU6XbJV1g4VBzgAycqSOLbIVv3nE8S1Rmrc0dk6gmQmJidkqKyUSiWlKcW8GkhKOEDPnYB8N/COwhCpKl0jWtfnZNjpmxuc5mV1VKgaL6jV2xJubmK9LyZrazPzdOmpf4510KUUFaiMpUefMY4jnviQNMdR7ik7Ys6hVSy65MTrz4ps3MrYcbEslCkJQ6vKDkcCwScjdKvqm2EbkrDKCHtBzvut/72WI6QRG7Db1UW9JKzKzdloSczbqOtqtImxNssZGXU4IUE5wOIbEA88EcyI0tK1kvGqv0+lSOllZNWLqET4eSpplpOe2QpSez6uLAHribIRhk4DAx7b2080x0Jx42utfVVAuGjSTOrN4zV06d3NcEpMVFwyS5JDzaU9tRKuJI7QIIx7I295Uldx2np9S7ctO4qDT5Ssvy5acbcW/LJWtpZd4iMgZWogn8k+EWohD+nn4TbMd53W0U/QRmL5HuG++qrlZ9mTll9IZkXFLVm4pJ9jFIrD3WPeTLOwDpGQD5yd9hkKwM5EYWHQ6PIUh1m79Kruq8+Xypt6XQ+ylLXCkBGABuCFHPrxF3IR1vKDs8Q1tttoh1A3Kx0vsvqq6TYqVQ1X03uGmWjWWJKToziEyrjKuNnqw+lDalqwlKiAnHER5w33jXXhWr11TrVrUVzT6rUaap9U6+beeQvqEIBTvxKSMADOfXsM5xFnIQttWGkENzGmZ7/AMrbqUuBBdkddO78KvPFc2jmqVz1f7mJ+vW3ccx5UX5FBUthXEteCMbYLixg4yMEHIIjP0/kLqv7WxjUytW/NW9SqXJqlpBiaGHHspcTuCAf51xROMeaBncxO8Iyau7T8PxEWv3LQpbOHxfCDe3eoz6UXoKuL9F96ajF6J6Ep0VpikpAK5iYKsd561Q/YBGV0ovQVcX6L701GN0UfQnSvn5j+MqGf4X8vZY/zP4+6lWEIRArUir9S+XAn59n3BMWgir9S+XCj59r3BMX0GsnhKirdI/EFaCEIRArUhCECEhCECEhCECEhCIt1Z1lk9Paqmmz1sVeYcdb42H8oRLveISvJOQcAgpBHhjGWRxOldhYLlYkkbG3E42Ckxialn332GZhpx2WWEPoSoFTaikKAUO4lKgfYRHtFKNLtZ6la18Vu4KxLu1JitkuTTDbgTwucWUKTnOwBUnHgfUIthpreLV8W6muS1HqdNllqKWjOJQOuA/GRwqOU92SBvnGcRRVUUlPmdN6npqyOoHw67l08IQiNVpCEQrqtrwzZtUnqALWqqKo22ryd2a6tDK8ghLqeFSipGd+47YODnDIoXyuwsFylyysibiebBTJKTUtNoWuVmGn0ocW0stqCglaFFKknHIgggjuIj2imWh+tb9ioqcnW5Saq0pPTHlQKHAFtun/AIit+fFtkbbj1xbWza790luytaFLqFMRMp422Z1KUuFPcrCVHY92cEjfG8OqqR9O6ztN6TTVbKht267luIQhEqqSEIQISEIQISEIQIUZ9KL0FXF+i+9NRjdFH0J0r5+Y/jKjK6UPoLuL9G95ajB6JjqXNF6egAgtTMwg57z1hP8A5xeOxfy9lD/m/wAfdSzCEIgVyRV+pfLhT8+17gmLQRV+pfLgT8813/8AuCYuodZPCfZRVujPEFaCEIRCrUhCECEhCPCoTktT5CYn515LEtLNKdecVyQhIySfYBAhe8I8pSYYm5VmalnUusPIS424k5C0kZBHqIMesCEiKulNJOVLS1VOlKUuo1CanmGpNDbJccSvJUSjAyDwpUD6iYlWEbikMbw8bFiRgkYWnaqOVTRy/wC15SRr9Tt4Tsk2pL0yxLrDy2kgglLiBzGBuRkeJEXflUMNyrTcshDbCUANpQnhSlIGwAHIY7o9IRRU1j6m2PYkU1Iynvh2pCEIkVSRB3S3oc/cVHt2k0SiOVGrPTy1NrZZ4lttJRhQKuSUEqQTkgdkROMIbDKYZA8bEuaISsLDtVNLf0lvCy9QbYnrit9ufpS6hLiYcYxMNNBawCHABtw53J7ORsTFy4QhlTVPqCHP1CXT0zKcFrEhCETKhIRhu1SntViXpDk20mfmGVvssE9paEFIUoewrT+vwOMyCyEhCECEhCECFGnSh9Bdxfo3vLUazoi+hyX+mv8A7RGy6UXoLuL9F96ajW9EX0OS/wBNf/aIvHYj4vZQntv8fdS9CEIgVyRV+pfLhT8817gmLQRV+pfLhR8817gmLqHWTwlRVujPEFaCEIRCrUhCECF5Ta3m5R1yWZD7yUEttFfAFqxsniwcZ8YqZrhrdXa7SqjZTtruW84Xg1OB2ZLjpCTngwEpABwnfJyM4yDFuIrhrvppdWo2ryfgantSlPlJBll+ozA6ttS8rWcHHE4QFAbAgYwcRfyeYhL+qMt+5RV4lMVozmud0Q1vr9MplKsdq1XLhfSosSimpvq3OAnISQUEYSM75ACRvgDMWuYU4phtTzYbcKQVoCuIJONxnv8AbFeej5pzdOneqk6zXac09JTdOcbl6jLjjbKwtCsZxlGRxbEDOO/EWJjleYjL+kMvuihEoi/UOaQiN+kTfFWsGw2atRW5dU5Mz6JRKnkcSWwUOLKsZGT2MfXEN0/WTXEU9mpptVM/IvJ6xqYNHeU0tPqUggY2JjENFJKzGLW7ytzVkcTsBvfuCtZCKy0npP1GVmPJrms5CVpOHDKvqbUj/wCGsH94RKtka06f3YtEvLVf4OnFnCZWopDKye4BWSgk+AUT6o5JRTxi7m5fVdjrIZDYOz+ikWEIRKqUhGDW6vSqHT11CsVGVkJVHnOzDoQnPhk8z6ohy7ektZtMWtmhSE9XHU8lj+Tsq9ilAq/0Q6Knkl6jbpUs8cXXdZTjCKtf9IHU2uKItiypVaFHA6uUfml88c0kD1cu+PGma3ap0+96TS7rprNPam5loOS81TVsLLK3OAqSFEKxsrB33HfvFQ5Nmts+qm/5CG+36K1ccTq/e1TsO301uUth2tyqSRMKbmeq8n5YUocKjwnfccjjPOO2jWXa441alXdZlFTjiJF5SJdLfGXiG1YQE/jE8sd+YijIDxiFwq5AS02NiqT17Vqv1PVeU1AS0iXfkuBEvKBZU2loAhTZPMhWV5OPxj6os7onqdV9RkTD7tnuUuQYBSZ7yvrG3HNuwkFAJPPOCQNt9xFfqf0dNQ5q23KqtqSlpvzm6a68A84nHjgpSeWxUPXjvs3ocxPSmlNBkalTnadOSjKpd6Xdb4FJUhak5I/rYCs9+c98evyg6mMY5uxIy10/K8qgbUiQ85cA58V2kIQjxV7CQhCBCjTpRegu4v0X3pqNZ0RfQ5L/AE1/9ojZ9KL0F3F+i+9NRrOiL6HJf6a/+0ReOxHxeyhPbf4+6l6EIRArkir9S+XAj59r/wCnpi0EVfqXy4EfPNe4Ji6h1k8JUVbozxBWghCEQq1IQhAhIQhAhIjTpD3/AFXT20JSo0aWlXpuanBLgzKSpCE8ClE4BGT2R3xJcQJ02PwBov50H8JcU0bGyTta7RTVb3Mhc5uqhrVLUbUC9LSk5e5qO1K0kzSJliZbkXGkuL4FhOFqJSQUqUcDwzFqNA/Q5bH0FP7TEL61fJSsL56T91eiaNA/Q5bH0EftMX1rmuphhbYBxUVG1wqDidc4QuprNFo9al/J6xS5KoM4xwTLCXAP8QOIiC/OjhaNYacftp16gTu5SgEuy6j60qOU/wB04HgYm6EeZFPJEbsdZejLBHKLPF1Uim3ZqjobVmaRcsu5VKEVcLSHHCtlaf8AkPYygjHmHx83eO1vzpK0dqjsIsqRenanMtgkzbRQiVJ/FIB7avUDjvyeUThc9DplyUGbotXlkTEnNNlC0qG48FDwUDuD3ERV7oY0KmVK7avVZ6VamJimsNGVLic9WpalZWAeSuzsfWY9Jj4Jo3TSMzbrbQ3XnvZNC9sTH5O0vqLLKtvSDUPU2ebuHUatTchKr7TbT3amCk74Q35rI9oz/VMTbZ+kOn1rtoMlb0tNTCQP5TPDr3CfHtdlJ/sgR3kIilrJZMr2G4ZBWRUkUedrnecyviEpQgIQkJSkYAAwAIqb0vH5qW1poMxItdbNNUuXWyjq+PiWJl4pHD3793fy74tnFX+kj8pGy/mJD3x2H8mfOv3FJ5RF4bd4WDL6/wCptNr8hK3FQpGWZedR1jL0g6y4tsqwSniXz54OOfdFroqr0wvSlbX0Fv8Ajri1UZrAwxxva217rtIXh72Ode1khCEQK5IQhAhIQhAhRp0ofQXcX6L701Gs6Ivobl/pz/7wjZ9KH0F3F+i+9NRrOiL6HJf6a/8AtEXjsR8XsoT2z+PupehCEQK5Iq/UvlwJ+ea9wTFoIq9U/lwI+fa9wTF1DrJ4Soq3RniCtDCEIhVqQhEHdIe9dUrHd8to7VKNvvEIbm0SqlPMLI81ziUU884UAAeXPm2GIzPDG6lKmlETC86BSpbd10a4atW6ZTJkOzFFmhLTQ8FFOcj1Z4k+1Co3sfz707ve6bRuNyo26+XZ6eHUutuNl7rypQIBT3qz3jfJPiYvBpw9d8za8vNXszT5eqvdssSbakhpBAwleVKyvmTjAGcd2YqraI0xGeR+qmo6wVI0z9F0kQJ02PwBov50H8JcT3ECdNj8AaL+dB/CXGOT+0s4rdd2d/Bc1rT8lKwvnpP3V6Jn0C9DlsfQh+0xDGtXyUrD+fk/dXomjQP0OWx9CH7ximq7MPEVPTdpPhC7iEIR5S9NIq/0H/8AvW6PmJb95yLQRV/oP/8Ael0/My37zkXU/Zpf4/dQ1HaYv5fZWghCEQq5Iq/0kflIWX8zIe+OxaCKvdJL5SFl/MSHvjsehyb848CoeUPlDiFjdML0p239Bb/jri1UVV6YXpStr6C3/HXFqo5U9ni4H7rtP8+Xy+yQhFe+kPfmq9mTrzUq1TWaBN5blKhLyyi4nIPYWVKIS4PEAA4yMbgTQQOnfgac+9UTzCFmNwyU0WfddFutmfdosz16ZCdcknv7aDzHik8we+N5FBNKr5u+zqu4zaOHn6kpDSpRTHWh5QOE4SN+LJI2OcH2ReCyF3M5bUq7d6ae3V3E8TzUkhQbazySSVKyod5BxnlsMmitojTO1yOm9T0dYKlumY13LdwhCIVao06UXoLuL9F96ajWdEX0OS/05/8AaI2XSi9BVxfovvTUa3ojAjRyXJBGZ1/Hr7Qi8diPi9lCe2fx91L0IQiBXJFW72AkOmbTZghaRMzUmcg8+JlLX2bY+2LSRVnpQH4A12tW5SOFpLUs+pW26mX1E/YOD/8AkX8n5yObvBCir8ow7cQVaaEAQoAggg7giEQK1Ij7Xu1K5etlsW5Qyy2qZn2lTTry+FDTKQpRURzV2gjYCJBhG2PLHBw1Cy9ge0tOhVZqp0bKlQ26fWLVr6ahVZFxD7jEy2GUurQriHVqBPDuAMK278iLMwhDJqiSa3OG9kuGnjhvgFrpECdNj8AaL+dB/CXE9xAvTX/AGi/nQfwlw3k/tLOKVXdnfwXM61fJSsP5+T91eiaNA/Q5bH0IfvGIX1p+SlYfz8n7q9E0aB+hy2PoQ/eMU1XZh4ip6btJ8IXcQhCPKXppFW+hA6kVy5mSDxLlmFg92ApYP7wi0kVV6Ef4U3D9Bb/fi+m7NL5fdQ1HaIvP7K1UIQiBXJFX+kj8pCzPmJD3x2LQRV/pI/KQsv5iQ98dj0OTfnHgVDyh8ocQsXphelK2voKP464tVFVemD6Ura+gt/x1xaqOVPZ4uB+67T/Pl8vskRn0gbIruoNEpNvUh6XlpcT3lM3MPK7LaUoUlI4RuonjOANttyIkyERxyGNwc3UKqSMSNLXaFVxZ6PFSta5aBcNr1xNScp84w/NMTSAypwJWCvqyMjBGeyftMWOhCNzVEkxBeblZigZCCGCwSEIQlNUW9KuYDOiNZbJHx7ss2Mn/AJ6Fbf4Y+9FZpTeiFFWrGHXJlafZ16x/5RzvTQqSJbTinU0Lw7OVJKuHxQhCir/UpESBodT1UzSK2JVSSlRp7bxB5gufGb/4ovd8NEBvd7KFudYTubb1XZwhCIFckQR0zqB5dYdOr7aMuUub4HDjk06ME/40t/bE7xotQaAi6LJrFvr4czsottsq5JcxlCj7FBJ+qH00vNStfuKTUR87E5m9afQyvi5NKaBUlL4nkywlnt9+Nr4sk+s8PF9cdrFb+hbX1tor9mzeUOsuCdZbVzHJt0Y7sEN/WTFkI1Vxc1M5o0WaWTnIWu2pCEau7a5K21bc/Xp1l96WkWi86hhIUspHPAJAJ+sROASbBPJsLlaSwr9pt3165qTJMrbcoM75KtSlZDw3HGPAcSFjv2AOd8Dr4rfo9VpC2dV5xxhYqMnfU4X6W+24B1bA61wqcTzCgtXV8JAOULPIDNkIoqohE+zdP/e6RTSmRlzr/wC9kiBOmv8AgDRfzoP4S4nuIE6a/wCANF/Og/hLjfJ/aWcViu7O9c1rT8lKwvn5P3V6Jo0D9DlsfQh+0xDOs6Fq6KFjKSkkIdkio+A8mdGftI+2PPTLpC0O2LKpNvT9v1F1Uix1SnmXEEK3JBAOPHxi2SGSanswXs4qOOZkVRd5tdoVooRE1A6QumlUUEP1CdpSyQAJ2VIB/vN8SR9ZiTKNV6VWpMTlIqUnUJc8nZZ5LiftSTHlyQyR9dpC9OOaOTqOBWbFVehH+FNw/QW/34tVFVehH+FNw/Qm/wB+Kqbs03l91LUdoi8/srVQhHJXZqTY1rKW1WrlkWX0bKl21F15J8ChGVD6wIiaxzzZouVY5zWi7jZdbFX+kj8pGy/mJH3x2Ouq3SbseWUUSFMrc8e5fVIbQftVxf6Yh68r9l9R9b7UrMlTX5Ftl6TlA24sLUoiZK+LYbefjHq+z1KGmmjeXObYWK82tqYpGBrXXNwup6YXpTtr6C3/AB1xaqKq9ML0pW19BR/HXFqoRU9ni4H7p9P8+Xy+yQhHPaj3SxZVmz1zTUq5NMyZa42m1BKlBbqG9ie8cecd+MRC1pcQBqVY4houVgaYX9Tr7Yq7siwtg02oOShSpXF1iB5jo22ChnbuIPtjsIrx0a3aXZdX+5V15ycqVyr8tlSwApDUklpS2XHTnsKWMkJxkZTnGYsPD6qJscpDdNiRSyOkjBdrtSEI8puYZlJV6amXEtMMoU44tXJKQMkn2AROqFVzpMvuXlrhb9jyrhKZcMy68fzbj6wpavqb6sn2RaWXZal5duXZQENNICEJHJKQMARVno4sP3xrtXb7mkK6qVLswji34FvFSG0ewN8f+ERamL644MEP+o9TqoaL48c3+x9BokIQiBXJCEIEKp9550r6UTFc3apVSeEy4fxeqfJQ9nkOyvjVj1Ji2A3GREKdL20/hvT5qvyzfFN0R3rFYG5YXhKx9R4FeoAx0fRwu4XbpfILfc45+nDyGaydyUAcKjnc5RwnPjxeEehUDnadko1GR9lBB+lO+I6HMe6kiNfcvB9zlT45AVFHkjvFJk/9oHAfi+R87ly742EIgGSvKqDJ1KyresFd92LMTy67T5xUtKylRKFmm+UDc4x8YAEOBKj3uHIyItpRppc9SJKdcQG1zEuh1SRySVJBI/XFebylNK6PrZNUe6bbm6Q1UEtOCabmv5DN8Skr4nG8AtjrE8JKTjYk4yY6vo33dWKtL3RL3ROnrZatFplUwsJ4VOEjqE5PcU4CR44j06tnORiQX357jsG+y82mfzchYbZ5Zbx9rqZYgXprpUdP6MrB4RVQCcbf8Jz/APBieoxapTqfVZNUnVJCVnpZfnMzLKXEH2pUCIhp5eZkD7XsrKiLnYyy9rqslo9IC2qXYVLteqWnM1BEnJty7wWttTbhSBvwqHLI5GPKd1j0knAoTOkcmsq5qErLhX+IJBiwn3vbB/oPbP8AlTH+2H3vrB/oRbP+VMf7Yt6TS3vgP1UfR6m1i8fRVIua4dGas2tUnY9do76tw5JzyeHP9hfEnHqAEcFTazO0Csqn7ZqlQklJV8U8lXVuFO2ygkkH2ZIPeO6L6/e+sH+hFs/5Ux/tj8zGnlhTCCh2yrdIICcimtJIA5AEJyIoZypEwYcJI7zf7qd/JsrzixAHuFlBmlnSTdDrVNv6XSpBwlNTlm8FPrcbHMetH+E844Ho7agUXTybr1Tq6H3lvyjbctLspyp1fFnGTskDvJPsB5ROt59Haw60ytdHbmKBNndK5dZcaJ7uJtR5epJTHEWn0XXhUVruq4mlSaFfFt05J6xwdxKlpwj2AK9ojTZ6EsdqMVrjguOhrQ9uhtfPio21H1sva8XHWEzqqPTFbCTklFGU/wBdzzln1bA+AjmLRdsiXw7dMpXJ5YOQzJONsox61EEn6sRc+haP6bUdpKGLSp0wRzVOI8pKvWesyPsEbX73tg/0Htn/ACpj/bHBylAxuBjCB3ZFdPJ073Y3vBPfmqz0fUXRWlNpTL6Tqe4fxpt1MwT7esKsx0NO1503przb1O0xZk3WjltcuxLtqQfEFKRjv5RO/wB72wf6D2z/AJUx/th972wf6D2z/lTH+2J3VVM7rNcfNUNpqhvVcB5Ko+r+oErqXfdDqFPpkzJhhtuW6t1YUpSutJ2xt+NF3o0EjZNmSE23NyNo0CVmWlBTbzNNZQtBHIhQTkHaN/E9VUMla1jBYN90+mgfGXOebkpEQ9IW5FyNVtS0ZmTTM0a5ZlyUqSSO1wFTSUlCvxVJLnGPWkc94lt95lhAW+620kqSgKWoAFSiABv3kkAesxWGpXRRqjceobuo0zOrp1HrIRRksKw+y+nrWwGM7AlDaVHPZykKO+55SR4n4rXA/pdq5MLcN7X/ALXU6JM2HJ6uVamWq3UKxNytPS07VnlI6hlDYbbDbeB2icDK+/hONtzPERl0bpChs6dt1Kh205RGZ55agX5jrn5lCTwpcWrhTjPawkDA5jmYk2MVTsUp7ss+5apW4Yx35/VIifpUXR9z2lU1JsuBM3WFiSbGd+rO7p9nCCn++IliKoayTD2qfSDp1lSLilSFPe8kWpB83HbmV+0BPD4HgHjDKGMPlBdo3M+SxWyFsRa3U5DzUrdFW1/uf0rlp19rgm6wszq88+rOzQ9hSOL++YlmPOWYZlpZqWl20tstICG0J5JSBgAfVHpE8shleXnanxRiNgYNiQhCFpiQhCBC8KhKS8/ITEjNtB2WmWlNPNnkpCgQofWCYqto7OTOk2vVQsuqurTTqi6JVK1HsqJPFLu/WFcPqKznlFsIgPpf2QupUGVvamtnyylANzRQO0pgqyFePYUfsUT3RdRPBJido7Lz2KKsYbCVurc/Lap8hEfaBXym+tP5WbfdCqpJYlZ8Z3K0jZz2LGFe3iHdEgxJIwxuLXahVMeHtDm6Fchqra1vXHbMw7W7aNdckmluy7LKuCYJAyUtrBBGcDbODgbGK23leVlXBpgLbs+VnreqslUmp8MzSyVzSkILeEug7uJSU4CseYAMnGbgxxl2abWTW5l+rzto06fqfCXASSz16wNgtSdjkgAlQO3jFVLUtjyfc2zGftopqmndJmywvrl76rUWnqjRWLWtD7r6gKfU61IhaXHmylpa04SoqXjhRk774G/siShuMiKfa4XtN3LLS1uXNptN0GbkHCmRdafJUzkAFISWwlxBCRskjPCMEd+5uCh3OxplaNxS95N0W4qbKrZbl56fEi8/K8ZLQw4oDiSNsE8Kk43OMF76EENcThLie8d2iSytILm2vYDu46q1EYVeqctRaHP1mcDhlpCWcmXg2Mq4EJKlYHecAxyeh13z96WGzUqq0yioS7ypWZWytKm3VpCTxp4SRghQ5bZzjaNnqv6Lbs/Mk5/AXEHNkSYHb7K7nAY8bd11p9NdWbW1AqszTaE3UUvy7HXr8pZShPDxBOxCjvkiPupWrFr6f1WWptdbqKn5ljr0eTMpWOHiKdyVDfIMQR0KPw+rX5r/APVRH3pr/h9RfzX/AOq5HodCj6XzOz/pQdMk6Jz23/tTleGrtqWrQ7frFTbqRlq9LeUyYZYSpQRwIV2gVDBw4nx745j/AKSunf8A4Fd/+UR/viKukb6LNIsf+xD/AAJWOKmqvpirTdFPZtSpIuwMpCqj5Urqi5xZUrhKyMYyMcI+qHQUET4muIJJOy29JnrpWSOaCAANt9yunYl4UG9aIKvb855RLhZbcSpJSttY3KVJPI7j1RodStWbUsCqy1Mrnly5qYZ69KJZpK+FHEUgnKhzIP2RH3QtoU5I2pWa2+62ZepvtIYbS6lRT1XGCSB5pPGBg4PZzyIzC+o78/qbq1ck7Sz1zEqzMOsnOU+TSzZ3T/b4cj1r9cIjoo3VDmE/C3any1j207XgfE7YrqWvW5C5Leka7TFqVJzrIda4hhQB5gjuIOQfWI2UQH0MLl8us6o2w+4S7TJjrmAT/NO5JA9iwon+2InyIaiLmZXM3Kynl52Jr96RqrpuKiWvSF1Wv1FmQk0HHWOHzj+SkDdR2OwBO0Qhrxdl71e+E2DasyaFJoCBM1B58SoeUoAkJcUR2UggYRkk557A8J0gac9Q6va8hXpufq1Ap9OaRLlhSh5Uvm6VOqBSlSiPxeMhITkRTBQ4y3E7XO22ynmrMAcWjTLzXV9I26nK3clkyMnUHJG3XpditOzqkqSjhWs8C1DGeJKUkhOMkrAwTiMuiT2lmrGqgZlLMq06EBx+YmVudTK8W3xq20qySohA33O2RtGz08q8jrEzL024NK/JqBTmv5HOKm19U3gBKW09lJVsOYJxjlvEw2vbdBtin+QW/SpWnS+cqSyjBWfFR5qPrJJjckrYWCOxDhfbv4bViOJ0rzJcFpts3cdi2TDTTDLbDDaGmm0hCEISAlKQMAADkAI/cIR5q9FcjrBeDNj2BUa6op8pCOpk0H8d9eQgesDdR9STESdDq0HUylRv2poUt+eUqXk1uZKigKy65k8+JQCc8+yrxjmtdqzPap6wU7T+3nSuTkXywpad0dd/POnHNKEjH91WPOi0Fv0mSoVDkqNTm+rlJJhLLSe/hSMZPiTzJ7yY9B//AM9MGfufmeGxeez9eoL/ANrMhx2rOhCEeevQSEIQISEIQISPKclpedk3pObZQ9LvtqadbWMpWhQwUkd4IOI9YQIVQ6W9O6Ba4Oyc0p1duz+AVbnrJVSjwuetbZzn2KwAFRblh1t9lDzLiXGnEhSFpOQoEZBB7xHAa9aetagWW5LMIQKxJcT1PcOBlWO02Se5QAHtCSeURz0VdRne1pxci1sz0mVJp5e2VhOeKXOfxk4JHqyNuEZ9KYdKi54dYa/lefEejS80eqdPwrEQhCPNXoJEMV/o6WnWq/MVedr1xuOTLpdeC5htaiSc4ClIJx3b5wImeEMimfEbsNkuSJkos8XWqtK3aPatCYotDk0SsmwOykblRPNSidyo+Jj2uSmN1q3alRnlcLc/KOyyz4BaCkn9cZ8Rs1rtpU66hpu6crWoJSPg+ZGSeX83HWMkkOJoJP1Q50cYwuIAVX7CuSvaLakTfwjSS6+22qUnZRxZRxoJCgpKsEc0pIVg5BPjmF+XJXtaNSJQ0+klt91CJSSk218fVoBKipSsDvKlEkAAezMWb1AvLRlyu/Al5TVGm6hLHg4ZiRU/1JzukuBBCT4jI9cZs3XdJ9NGGXusolD8vaDjfkcrxOPt9ysNJKinfYnaPW6ZmJOaOMiy8romRj5wYAVDPTApiKJbunlGaVxtyEnMSqVY5hCJZIOPqjh2r40+b0x+59zT2Xfr3kamfhM8KSHTnDuQOLI2OO/GDsYtFW6vpXdlpM3XWn6JU6NKqUlqZm2wrqlqxxICVDiCzhPZxk4G0aOzWdBrpefFvUm2Zx6WQXXGlU7gXwjmoIcQCoDvIBxkeIjENUGQhr2O+E8M7rU1MXylzHgYhx2Kvmi1wVa07RviuMqebkV00SbRGQlU64tKWynu4kpLisc8fVH40RsnUOvMVKsWRUJanJQDJTDzr3AXEqAUWx2VZGySfaIn2b1L0EqtLlqHNTtLdpzTiVMSrlIeSy2rcAhJaCU+cd9sZMddUq9p5phSJRp96QoMhPuqXLolpdRS6vCeJWG0nu4cqO3LeNvrHgutH8Tt43LLKRhw3ku1u471V7Q6enNOteWaPVylkuPrpM5wnKSVEBBBP4vGEHPgc98XViN9S3dIbcqkrWL2p9KanqiorZmXKct9bpbCATlCFbgFGM/VHU2XeVs3nJvTds1dmoNMKCHQlKkLbJ5cSVgKAODg4wcHwMRVkjqi0uEjLM7FZSRtgvFiB3DauS1U0Wta/qiKtMOTNNqhAS5My3D8cBsONJGCQNs7HGAcgARsdJNNpTTqTmZaSrtVqDUwQSzMLSGWyCe0hAHZJzuc77eAju4ROaiQx82TkniCMP5wDNIQhCU5IjPpEahIsSynEybwTWqkFMyKQd29u27/AHQdv6xT647y46zTreoc3WqtMJl5KUbLjqz4dwA7yTgAd5Iiqtm02qa86wzFw1llbdvyKklxsk8KGgT1cuD3qVuVEeKj4RbRwtcTJJ1W+vco6uZzQI2dZ3p3qQ+iVp+ui0Fy9Ks0RUas2BKhY7TcvnPF7VnB/shOOZid4/LTaGmktNIShtCQlKUjASByAHcI/UTzzOmeXu2p8ELYWBjdiQhCFJqQhCBCQhCBCQhCBCRXTpQ6azLMyNSrUS4xOyqku1BDGygU7pmE43BGBxY8AruUYsXHxaUrQULSFJUMEEZBEOp53QPD2/2kzwNmYWOUbaCamy2oVt8E0pDVdkkhM6yNuMcg6kfknvHcfUQTJUVR1isWs6S3kzqDYxW1Sy9lTaE5TKqVzbWO9pXIeHLY8JM/aT3/AEnUK2k1Sn4YmmsInJNSgVsOY5etJ7ld/tBAfU07QOei6h9DuSaadxPNS9Yeo3rsIQhESsSKOaMVaSp01Iio3NQJCSFUbcmJGconlT77eUcXC71C+EEApA404IJ2zk3jjSJs+0kqCk2vQwoHIIkGsj/TFdNUiFrmkXupKmnMrmuBtZU0vioUalXjcNUoFXptYYm6k718hU6ZxrX8YolSV8JHBknCkrQsjG0dwzVqJIa4pujVWkobp1WocvMyCXZVT8uwpTLXZDfCThGHEctlb43BFlpq1bXm6kKlNW3R354K4xMuSLanQrx4inOfXmMusUik1mXEtV6XJVFkHIbmpdLqQfYoERS7lBrgBhOlib5pDaBzSTi23Atkqo6jzdlVOg25XLRt+aYsyQrzorbCZZTYdUpTZBKs7go4wkZHBxAYGQI2U5O2xc2utvzWlcihqVk5RSqi9KShlmigBXFlJCfxDw5IGSQN4s+3Tqe3Tvg5uRlUSXCUeTpaSGuE93DjGPVHlSaLRqSy4zSqTISDTpy4iWl0NJWfWEgZjArQBax22z37962aMk3uNmzdu3Kgsktj730yh2uU1JFQSv4LVIgzTo4U/GJf4CUpxkcJUBlJ2Od5A1Wqb2oFySclRbfqszIUS3mgiUl0lZlnVtJWSs45JKkIPI5bi1yLQtNC0rRa9EStJyFCQaBB8fNjPlKXTJOamJqUp0nLzEyeKYdaYSlbpyTlRAyrcnn4w1/KbS4PDcxpnvSWcnENLS7I9yqTd9wTt32to87Jolpyrszb9PLU0OJtx9tyVSgO+IUOAqB58RjtOiYgOXxes1UvJ6fWusDbtLYZ6pDQ4zxlKQcYSrCcDl47xPDFs22wplTFv0losOdayUSbYLa9u0nA2V2U7jfsjwjJZpNKYqTlTZpkk3POghyZQwkOrBxsVgZPId/dCZK0OiMQba/5unR0ZbKJHOv/AFZZsIQjz1ekfFrS2hS1qCUJGVKJwAPEx9is3SE1Tm7lqQ04sJS5vyl0S84/LkkzCycdS2R+J+Urkdxyzl9PTunfhHmdyTPO2FuI+Q3rTawXfV9Yr+lbDszidpDLxw4nzH1p2U+s9zad8fbvkAWR07tGl2RakpQKWnLbI4nXSO0+6fOWr1n9QAHdHM6EaYyendu5fDb9cnEJM9MDknvDSP6oPf8AjHfwAkeHVU7SBFF1R6nek0sDgTLL1j6DckIQiJWJCEIEJCEIEJCEIEJCEIEJCEIELwqEpK1CRfkZ1huYlphstutODKVpIwQR4Yip+oFn3NoZeTV4We867Q3HOHt5UEAndh4d6T3K58twoZNt48J+TlahJPSU9LtTMs+godadSFJWk8wQeYiinqDCd4Oo3qeeASjcRoVy2leoVD1CoIqFLX1Uy0Eibk1qHWMLI/Wk74V347iCB2EVQ1M03uXSK4hfNgTEwqktqKlpHaVKpJ3bcH47XgTy2zggKM06MasUXUOnBnLcjXGUZmJFSvO8Vt585P6xyPcS2opgG87Ebt+3FLgqCXc1Lk778FI0IQiJWJCEIEJCEIEJCEIEJCEIEJAkAZOwjym5mXk5V2am322GGklbjriglKEjmSTsBFYNXtXKzf1V+4PTZiadlplRZdfaThycHIpT+Q1jJKjjI54Gc0U9O+d1hoNTsCRPUMhFzqdBvWw191fm6zPq0/09W5NOzC/J5qblcqU8onHUtEd3cpQ57gbZJ7zQLSGTsKnpqtVS1M3HMN4ccG6ZVJ/m0evxV38htz9NCtH6dp/JpqM+Wp64nm+F18boYB5oayPtVzPqG0SpDp52NZzMPV2nf/0kwQOc7nZutsG5IQhEKtSEIQISEIQISEIQISEIQISEIQISEIQISEIQIX5cQhxtTbiErQoFKkqGQQeYIit+smhk5TJ5V4aZ9bLTDC+vXT5dRQttQ34pcjl3ng/w9wiyUIfBUPgdib/aTPAyZtnKBNFtfJWrKat6+1t06rJPVInVJ6tp9Q2wscm1/wCk+rYRPY3GREU6zaK0K+0OVKQLdKr+MiZSn4uYPg6Bz/tDcevGIiKz9SL70brCLUvqnTM5SUYDQUrK22844mHDstG47JO3LKd4qdBHUjFBk7a38KVs8lOcM2Y/2/KtnCNNZ900G7aQiqW/UmZ2XOyuA4W2r8laTuk+oxuY88gg2KvBBFwkIQji6kIQgQkaO9rsoNm0VdWr88iWYTkITzcdV+ShPNR/Z34ER/rDrlb9lpeplJLVYrqcpLSFZZl1f8xQ5kfkDfuPDEVWZprfGsFaRdt+z81J0pZy1xp4XHEcwllHJCP6xG+c4VkmLYaT4ecmOFvqeCjlqvi5uIYneg4rGuK57+17uE0C3JRyQt9tYK0FeG0DOzj6wNz3hIzy2BIzFgtJtM7f08pXU09Amai8kCan3E4cdPgkb8CM8kg+GSTvHR2rbtGtejM0igyDUlJtckIG6j3qUTupR7ycmNrHJ6rG3m4xZo9eK7BTYHc5Ibu+3BIQhEarSEIQISEIQISEIQISEIQISEIQISEIQISEIQISEIQISEIQISNRdts0O66QulV+nMz0qrcBY7SD+UlQ3SfWI28I6CQbhcIBFiqpXhpNfWltXXdOnVSm5ySb3UlreYbR3pcbxwuo9ePXgYzHeaUdIWh1/qqZdyWqJUzhImCrEq6fad2z6lbeuJxiLtVtErWvguz7CPgetK38rl0dl1Xi4jkr2jB8SeUXiqjnGGoGf+w1896hNNJCcVOctx08tylBCkrQFoUFJUMgg5BEfYqLK1bVnQedRJ1Fg1K3SvhbSpSnJRWf/DcxxNKO/ZON8nhMdBdHSanKhItyNnW26xUpjsB2aIdKFHbCG0+efDP2GOHk6Un9OxB2ror4wP1MjuU+XreFuWbSzULhqbMm3g9W2Tlx0juQgbqP7O/EVvu3Ve/tVasu19PaZOSUg52XCyfj1oO2XXOTSPYfVxKziMuzNDrvviqi5tT6rOS6XjxFhauKacGdknPZaT6sEjlhPOLG2rbdDtalIpdApkvISqdyltO6z+UpR3UfWSTGrwU2nxu9B+Vm09Tr8DfU/hRVpDoDRLYLNWugs1qspwpLZBMtLq9QP/EV/WUPDABGYmuEIjlmfM7E83VkULIm4WCyQhCFJiQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBC85qXYmpdyXmmG32XBwrbcSFJUPAg7ERqqRalrUeb8rpFtUanzGCOtlZFtpeD3ZSkGNzCOgkZLhAOaQhCOLqQhCBCQhCBCQhCBCQhCBCQhCBCQhCBCQhCBC/9k=";

const ReportsManager = ({ cycle }) => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCommission, setSelectedCommission] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, "cycles", cycle, "students"),
            orderBy("apellido")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStudents(
                snapshot.docs.map((d) => ({
                    docId: d.id,
                    ...d.data(),
                    grades: d.data().grades || {},
                }))
            );
        }, (error) => {
            console.error(error);
        });
        return unsubscribe;
    }, [cycle]);

    // Lista de comisiones únicas
    const commissionOptions = Array.from(
        new Set(
            students
                .map((s) => (s.comision || s.Comisión || "").toString().trim())
                .filter(Boolean),
        ),
    ).sort((a, b) => Number(a) - Number(b));

    const calculateTotal = (grades, examPrefix) => {
        const exams = [
            `${examPrefix}1-${cycle}`,
            `${examPrefix}2-${cycle}`,
            `${examPrefix}3-${cycle}`,
        ];
        const recupId = `${examPrefix}R-${cycle}`;

        let total = 0;
        let hasAbsent = false;

        exams.forEach((ex) => {
            const val = grades?.[ex];
            if (typeof val === "number") {
                total += val;
            } else if (val === "Aus") {
                hasAbsent = true;
            }
        });

        const recupVal = grades?.[recupId];
        if (hasAbsent && typeof recupVal === "number") {
            total += recupVal;
        }

        return total;
    };

    const formatGrade = (val) => {
        if (val === undefined || val === null) return "-";
        if (val === "Aus") return "Aus";
        // Mostrar hasta 2 decimales, sin ceros innecesarios
        return Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
    };

    // Genera el boletín para UN estudiante dentro de un PDF existente
    // startY: posición Y donde empieza este boletín (0 = inicio de página, 148 = mitad)
    const drawBoletin = (pdf, student, startY, titulo, autoTable) => {
        const matTotal = calculateTotal(student.grades, "M");
        const plTotal = calculateTotal(student.grades, "L");
        const granTotal = matTotal + plTotal;

        // Encabezado
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(titulo, 10, startY + 5);

        // Logo del colegio (derecha del encabezado)
        pdf.addImage(LOGO_B64, "PNG", 175, startY + 5, 22, 29);

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("UNIVERSIDAD NACIONAL DE BUENOS AIRES", 95, startY + 14, {
            align: "center",
        });

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.text(
            "Curso de Ingreso Colegio Preuniversitario Ramón Cereijo, Escobar",
            95,
            startY + 20,
            { align: "center" },
        );

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`BOLETÍN DE NOTAS ${cycle}`, 95, startY + 27, {
            align: "center",
        });

        // Datos del alumno
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(
            `Alumno/a: ${student.apellido}, ${student.nombre}`,
            10,
            startY + 38,
        );
        pdf.text(
            `Comisión: ${student.comision || student.Comisión || "-"}`,
            10,
            startY + 46,
        );
        pdf.text(`DNI: ${student.dni}`, 120, startY + 46);

        // Tabla de notas usando autoTable directamente
        autoTable(pdf, {
            startY: startY + 52,
            head: [
                [
                    "Materia",
                    "1° Exam.",
                    "2° Exam.",
                    "3° Exam.",
                    "Recup.",
                    "Total",
                    "Gran Total",
                ],
            ],
            body: [
                [
                    "Matemática",
                    formatGrade(student.grades?.[`M1-${cycle}`]),
                    formatGrade(student.grades?.[`M2-${cycle}`]),
                    formatGrade(student.grades?.[`M3-${cycle}`]),
                    formatGrade(student.grades?.[`MR-${cycle}`]),
                    matTotal,
                    {
                        content: granTotal,
                        rowSpan: 2,
                        styles: {
                            valign: "middle",
                            fontStyle: "bold",
                            fontSize: 11,
                        },
                    },
                ],
                [
                    "P. Lengua",
                    formatGrade(student.grades?.[`L1-${cycle}`]),
                    formatGrade(student.grades?.[`L2-${cycle}`]),
                    formatGrade(student.grades?.[`L3-${cycle}`]),
                    formatGrade(student.grades?.[`LR-${cycle}`]),
                    plTotal,
                ],
            ],
            theme: "grid",
            headStyles: {
                fillColor: [230, 230, 230],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                fontSize: 8,
            },
            bodyStyles: { halign: "center", fontSize: 9 },
            columnStyles: {
                0: { halign: "left", fontStyle: "bold", cellWidth: 35 },
            },
            margin: { left: 10, right: 10 },
            tableWidth: "auto",
        });

        const afterTableY = pdf.lastAutoTable.finalY + 14;

        // Líneas de firma
        pdf.setLineDash([2, 2]);
        pdf.line(10, afterTableY, 80, afterTableY);
        pdf.line(120, afterTableY, 190, afterTableY);
        pdf.setLineDash([]);
        pdf.setFontSize(7);
        pdf.text("Firma del alumno/a", 10, afterTableY + 5);
        pdf.text(
            titulo.includes("Escuela")
                ? "Sello escuela"
                : "Firma padre / madre / tutor",
            120,
            afterTableY + 5,
        );
    };

    // Genera el PDF para una lista de estudiantes (puede ser 1, una comisión, o todos)
    const generatePDFForList = async (studentList, filenameSuffix) => {
        if (studentList.length === 0) return;

        // Carga jsPDF y autoTable solo cuando el usuario los necesita
        const [{ jsPDF }, { default: autoTable }] = await Promise.all([
            import("jspdf"),
            import("jspdf-autotable"),
        ]);

        const pdf = new jsPDF({ unit: "mm", format: "a4" });

        studentList.forEach((student, index) => {
            if (index > 0) {
                pdf.addPage();
            }

            // Boletín superior (Original: Escuela)
            drawBoletin(pdf, student, 5, "Original: Escuela", autoTable);

            // Línea de corte en el centro de la página
            pdf.setLineDash([3, 3]);
            pdf.line(0, 148, 210, 148);
            pdf.setLineDash([]);
            pdf.setFontSize(7);
            pdf.setTextColor(150);
            pdf.text("✂  Línea de corte", 85, 147);
            pdf.setTextColor(0);

            // Boletín inferior (Copia: Estudiante)
            drawBoletin(pdf, student, 152, "Copia: Estudiante", autoTable);
        });

        pdf.save(`Boletines_${filenameSuffix}.pdf`);
    };

    // Imprime boletín individual
    const handlePrintOne = (student) => {
        generatePDFForList([student], `${student.apellido}_${student.nombre}`);
    };

    // Imprime todos los de la comisión seleccionada
    const handlePrintCommission = async () => {
        setIsGenerating(true);
        await new Promise((r) => setTimeout(r, 50));
        const list = selectedCommission
            ? students.filter(
                  (s) =>
                      (s.comision || s.Comisión || "").toString().trim() ===
                      selectedCommission,
              )
            : [];
        generatePDFForList(list, `Comision_${selectedCommission}`);
        setIsGenerating(false);
    };

    // Imprime todos los estudiantes
    const handlePrintAll = async () => {
        setIsGenerating(true);
        await new Promise((r) => setTimeout(r, 50));
        const sorted = [...students].sort((a, b) =>
            (a.apellido || "").localeCompare(b.apellido || ""),
        );
        generatePDFForList(sorted, "Todos");
        setIsGenerating(false);
    };

    // Lista filtrada para la tabla (búsqueda + comisión)
    const filtered = students.filter((s) => {
        const matchSearch = `${s.apellido} ${s.nombre} ${s.dni}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchComision =
            !selectedCommission ||
            (s.comision || s.Comisión || "").toString().trim() ===
                selectedCommission;
        return matchSearch && matchComision;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Generación de
                    Boletines
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filtros y acciones masivas */}
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    {/* Buscador */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
                            placeholder="Buscar por nombre, apellido o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Selector de comisión */}
                    <div className="w-48">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Comisión
                        </label>
                        <select
                            className="w-full h-10 border rounded-md px-3 text-sm bg-background"
                            value={selectedCommission}
                            onChange={(e) =>
                                setSelectedCommission(e.target.value)
                            }
                        >
                            <option value="">Todas</option>
                            {commissionOptions.map((c) => (
                                <option key={c} value={c}>
                                    Comisión {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón imprimir comisión */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectedCommission || isGenerating}
                        onClick={handlePrintCommission}
                        className="gap-2"
                    >
                        <Users className="w-4 h-4" />
                        {isGenerating
                            ? "Generando..."
                            : `Imprimir comisión ${selectedCommission || ""}`}
                    </Button>

                    {/* Botón imprimir todos */}
                    <Button
                        size="sm"
                        disabled={isGenerating || students.length === 0}
                        onClick={handlePrintAll}
                        className="gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        {isGenerating
                            ? "Generando..."
                            : `Imprimir todos (${students.length})`}
                    </Button>
                </div>

                {/* Tabla */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Comisión</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead className="text-right">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center text-muted-foreground py-6"
                                    >
                                        No se encontraron estudiantes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((student) => (
                                    <TableRow key={student.docId}>
                                        <TableCell className="font-medium">
                                            {student.apellido}, {student.nombre}
                                        </TableCell>
                                        <TableCell>
                                            {student.comision ||
                                                student.Comisión}
                                        </TableCell>
                                        <TableCell>{student.dni}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handlePrintOne(student)
                                                }
                                                className="gap-2"
                                            >
                                                <Printer className="w-4 h-4" />{" "}
                                                Imprimir Boletín
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default ReportsManager;
